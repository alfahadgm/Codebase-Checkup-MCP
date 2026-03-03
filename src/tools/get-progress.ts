import { z } from 'zod';
import { getSession, getFixProgress } from '../session/manager.js';
import { SessionStatus } from '../session/types.js';

export const getProgressSchema = z.object({
  sessionId: z.string().describe('The session ID to check progress for.'),
});

export type GetProgressInput = z.infer<typeof getProgressSchema>;

function describeStatus(
  status: SessionStatus,
  progress: ReturnType<typeof getFixProgress> & object,
): {
  statusDescription: string;
  nextStep: string;
} {
  switch (status) {
    case 'in_progress':
      return {
        statusDescription: `Audit in progress: ${progress.auditPhasesCompleted}/${progress.auditPhasesTotal} phases complete.`,
        nextStep: 'Continue the audit — call checkup_get_status for current phase details.',
      };
    case 'complete':
      return {
        statusDescription: `Audit complete (${progress.auditPhasesCompleted} phases). Fix plan not yet generated.`,
        nextStep: 'Call checkup_get_fix_plan to generate the fix plan.',
      };
    case 'fixing':
      return {
        statusDescription: `Applying fixes: ${progress.completedFixes}/${progress.totalFixes} done, ${progress.failedFixes} failed, ${progress.skippedFixes} skipped.`,
        nextStep: progress.currentFix
          ? `Next fix: ${progress.currentFix.id} (${progress.currentFix.findingId}): ${progress.currentFix.title}`
          : 'All fixes processed.',
      };
    case 'fixes_complete':
      return {
        statusDescription: `All fixes processed: ${progress.completedFixes} completed, ${progress.skippedFixes} skipped, ${progress.failedFixes} failed out of ${progress.totalFixes} total.`,
        nextStep:
          'Fix execution complete. Run tests to verify all changes, then report final status to user.',
      };
  }
}

export function handleGetProgress(input: GetProgressInput) {
  const session = getSession(input.sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Session "${input.sessionId}" not found. It may have expired (sessions last 2 hours).`,
        },
      ],
      isError: true,
    };
  }

  const progress = getFixProgress(input.sessionId);
  if (!progress) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Could not retrieve progress for session "${input.sessionId}".`,
        },
      ],
      isError: true,
    };
  }

  const { statusDescription, nextStep } = describeStatus(progress.auditStatus, progress);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            sessionId: input.sessionId,
            statusDescription,
            ...progress,
            nextStep,
          },
          null,
          2,
        ),
      },
    ],
  };
}
