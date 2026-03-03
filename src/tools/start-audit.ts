import { z } from 'zod';
import { filterPhases, getPhasesInRange, ALL_PHASES } from '../lib/phase-config.js';
import { createSession, getSession } from '../session/manager.js';
import { buildPhasePrompt } from '../lib/prompt-builder.js';
import { findingFormat } from '../prompts/templates/finding-format.js';

export const startAuditSchema = z.object({
  phases: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of phase IDs to run (e.g., ["P1", "P3", "P9"]). Defaults to all 10 phases.',
    ),
  startFrom: z
    .string()
    .optional()
    .describe('Optional phase ID to start from (e.g., "P5"). Runs this phase through P10.'),
  resumeSessionId: z
    .string()
    .optional()
    .describe(
      'Optional session ID to resume a previously started audit. Returns the current phase prompt.',
    ),
});

export type StartAuditInput = z.infer<typeof startAuditSchema>;

export function handleStartAudit(input: StartAuditInput) {
  // Handle resume
  if (input.resumeSessionId) {
    const session = getSession(input.resumeSessionId);
    if (!session) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Session "${input.resumeSessionId}" not found. It may have expired (sessions last 2 hours). Start a new audit with checkup_start_audit.`,
          },
        ],
        isError: true,
      };
    }

    if (session.status === 'complete') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                sessionId: session.id,
                isComplete: true,
                progressSummary: `Audit already complete. ${session.completedPhases.length} phases done.`,
                nextStep: `Call checkup_get_report with sessionId="${session.id}" to get the final report.`,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    const currentPhase = session.phases[session.currentPhaseIndex];
    const prompt = buildPhasePrompt(currentPhase, session.completedPhases);
    const outputFormat = findingFormat(currentPhase.id, currentPhase.name);
    const completedIds = session.completedPhases.map((p) => p.phaseId);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              sessionId: session.id,
              resumed: true,
              totalPhases: session.phases.length,
              currentPhase: {
                id: currentPhase.id,
                name: currentPhase.name,
                description: currentPhase.description,
                number: session.currentPhaseIndex + 1,
              },
              progress: {
                current: session.currentPhaseIndex + 1,
                total: session.phases.length,
                percent:
                  Math.round((session.completedPhases.length / session.phases.length) * 100 * 10) /
                  10,
                completed: completedIds,
              },
              nextStep: `Immediately analyze the codebase following the prompt below, then call checkup_next_phase with sessionId="${session.id}", completedPhaseId="${currentPhase.id}", and your findings.`,
            },
            null,
            2,
          ),
        },
        {
          type: 'text' as const,
          text: `\n---\n\n## Resuming Audit — ${currentPhase.id}: ${currentPhase.name}\n\n${prompt}\n\n${outputFormat}`,
        },
      ],
    };
  }

  // Normal start
  let phases;
  let invalidIds: string[] = [];
  if (input.startFrom) {
    phases = getPhasesInRange(input.startFrom);
  } else if (input.phases && input.phases.length > 0) {
    const result = filterPhases(input.phases);
    phases = result.phases;
    invalidIds = result.invalidIds;
  } else {
    phases = [...ALL_PHASES];
  }

  if (phases.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: No valid phases found. Available phases: ${ALL_PHASES.map((p) => p.id).join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  const session = createSession(phases);
  const currentPhase = phases[0];
  const prompt = buildPhasePrompt(currentPhase, []);
  const outputFormat = findingFormat(currentPhase.id, currentPhase.name);

  const result = {
    sessionId: session.id,
    totalPhases: phases.length,
    currentPhase: {
      id: currentPhase.id,
      name: currentPhase.name,
      description: currentPhase.description,
      number: 1,
    },
    progress: {
      current: 1,
      total: phases.length,
      percent: 0,
      completed: [] as string[],
    },
    ...(invalidIds.length > 0
      ? { warnings: [`Unrecognized phase IDs ignored: ${invalidIds.join(', ')}`] }
      : {}),
    nextStep: `Immediately analyze the codebase following the prompt below, then call checkup_next_phase with sessionId="${session.id}", completedPhaseId="${currentPhase.id}", and your findings.`,
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
      {
        type: 'text' as const,
        text: `\n---\n\n## Audit Prompt for ${currentPhase.id}: ${currentPhase.name}\n\n${prompt}\n\n${outputFormat}`,
      },
    ],
  };
}
