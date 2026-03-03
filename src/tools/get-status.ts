import { z } from 'zod';
import { getSession } from '../session/manager.js';

export const getStatusSchema = z.object({
  sessionId: z.string().describe('The session ID to check status for.'),
});

export type GetStatusInput = z.infer<typeof getStatusSchema>;

export function handleGetStatus(input: GetStatusInput) {
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

  const completedIds = session.completedPhases.map((p) => p.phaseId);
  const currentPhase =
    session.currentPhaseIndex < session.phases.length
      ? session.phases[session.currentPhaseIndex]
      : null;
  const remainingPhases = session.phases.slice(session.currentPhaseIndex).map((p) => p.id);

  const result = {
    sessionId: session.id,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    progress: {
      current: session.currentPhaseIndex + 1,
      total: session.phases.length,
      percent: Math.round((session.completedPhases.length / session.phases.length) * 100 * 10) / 10,
      completed: completedIds,
    },
    currentPhase: currentPhase
      ? {
          id: currentPhase.id,
          name: currentPhase.name,
          description: currentPhase.description,
        }
      : null,
    remainingPhases,
    nextStep:
      session.status === 'complete'
        ? `Audit complete. Call checkup_get_report with sessionId="${session.id}" to get the final report.`
        : currentPhase
          ? `Immediately analyze the codebase for ${currentPhase.id}: ${currentPhase.name}, then call checkup_next_phase with sessionId="${session.id}", completedPhaseId="${currentPhase.id}", and your findings.`
          : 'No phases remaining.',
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
