import { z } from 'zod';
import { getSession, skipPhase } from '../session/manager.js';
import { buildPhasePrompt } from '../lib/prompt-builder.js';
import { findingFormat } from '../prompts/templates/finding-format.js';

export const skipPhaseSchema = z.object({
  sessionId: z
    .string()
    .describe('The session ID returned by checkup_start_audit.'),
  phaseId: z
    .string()
    .describe('The phase ID to skip (e.g., "P7").'),
  reason: z
    .string()
    .max(10_000, 'Reason exceeds 10KB limit.')
    .describe('Why this phase is being skipped (e.g., "Backend-only project, no UI to audit").'),
});

export type SkipPhaseInput = z.infer<typeof skipPhaseSchema>;

export function handleSkipPhase(input: SkipPhaseInput) {
  const session = getSession(input.sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Session "${input.sessionId}" not found. It may have expired (sessions last 2 hours). Start a new audit with checkup_start_audit.`,
        },
      ],
      isError: true,
    };
  }

  const updated = skipPhase(input.sessionId, input.phaseId, input.reason);
  if (!updated) {
    const currentPhase = session.phases[session.currentPhaseIndex];
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Cannot skip phase "${input.phaseId}". The current phase is "${currentPhase?.id ?? 'none'}" (${currentPhase?.name ?? 'audit may be complete'}). You must skip the current phase.`,
        },
      ],
      isError: true,
    };
  }

  const completedCount = updated.completedPhases.length;
  const totalCount = updated.phases.length;
  const progressSummary = `Skipped ${input.phaseId}. Completed ${completedCount}/${totalCount} phases.`;

  if (updated.status === 'complete') {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            isComplete: true,
            skipped: input.phaseId,
            reason: input.reason,
            progressSummary,
            progress: {
              current: totalCount,
              total: totalCount,
              percent: 100,
              completed: updated.completedPhases.map(p => p.phaseId),
            },
            nextStep: `All phases complete! Immediately call checkup_get_report with sessionId="${updated.id}" to get the final aggregated report.`,
          }, null, 2),
        },
      ],
    };
  }

  const nextPhase = updated.phases[updated.currentPhaseIndex];
  const prompt = buildPhasePrompt(nextPhase, updated.completedPhases);
  const outputFmt = findingFormat(nextPhase.id, nextPhase.name);
  const completedIds = updated.completedPhases.map(p => p.phaseId);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          isComplete: false,
          skipped: input.phaseId,
          reason: input.reason,
          currentPhase: {
            id: nextPhase.id,
            name: nextPhase.name,
            description: nextPhase.description,
            number: updated.currentPhaseIndex + 1,
          },
          progress: {
            current: updated.currentPhaseIndex + 1,
            total: totalCount,
            percent: Math.round((completedCount / totalCount) * 100 * 10) / 10,
            completed: completedIds,
          },
          progressSummary,
          nextStep: `Immediately analyze the codebase following the prompt below, then call checkup_next_phase with sessionId="${updated.id}", completedPhaseId="${nextPhase.id}", and your findings.`,
        }, null, 2),
      },
      {
        type: 'text' as const,
        text: `\n---\n\n## Audit Prompt for ${nextPhase.id}: ${nextPhase.name}\n\n${prompt}\n\n${outputFmt}`,
      },
    ],
  };
}
