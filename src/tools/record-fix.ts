import { z } from 'zod';
import { getSession, recordFix } from '../session/manager.js';

export const recordFixSchema = z.object({
  sessionId: z
    .string()
    .describe('The session ID from checkup_start_audit.'),
  fixId: z
    .string()
    .describe('The fix ID to record (e.g., "FIX-001").'),
  status: z
    .enum(['completed', 'skipped', 'failed'])
    .describe('Whether the fix was completed, skipped, or failed.'),
  description: z
    .string()
    .max(50_000, 'Description exceeds 50KB limit.')
    .describe('What was done, or why the fix was skipped/failed.'),
  filesModified: z
    .array(z.string())
    .optional()
    .default([])
    .describe('List of file paths that were modified.'),
});

export type RecordFixInput = z.infer<typeof recordFixSchema>;

export function handleRecordFix(input: RecordFixInput) {
  const session = getSession(input.sessionId);
  if (!session) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: Session "${input.sessionId}" not found. It may have expired (sessions last 2 hours).`,
      }],
      isError: true,
    };
  }

  if (!session.fixPlan) {
    return {
      content: [{
        type: 'text' as const,
        text: 'Error: No fix plan exists for this session. Call checkup_get_fix_plan first.',
      }],
      isError: true,
    };
  }

  const fixItem = session.fixPlan.find(f => f.id === input.fixId);
  if (!fixItem) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: Fix "${input.fixId}" not found. Valid IDs: ${session.fixPlan.map(f => f.id).join(', ')}`,
      }],
      isError: true,
    };
  }

  if (fixItem.status !== 'pending' && fixItem.status !== 'in_progress') {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: Fix "${input.fixId}" is already ${fixItem.status}. Cannot record again.`,
      }],
      isError: true,
    };
  }

  const updated = recordFix(input.sessionId, input.fixId, {
    fixId: input.fixId,
    findingId: fixItem.findingId,
    status: input.status,
    description: input.description,
    filesModified: input.filesModified ?? [],
  });

  if (!updated) {
    return {
      content: [{
        type: 'text' as const,
        text: 'Error: Could not record fix. Session may have expired.',
      }],
      isError: true,
    };
  }

  const plan = updated.fixPlan!;
  const pending = plan.filter(f => f.status === 'pending');
  const completed = plan.filter(f => f.status === 'completed');
  const skipped = plan.filter(f => f.status === 'skipped');
  const failed = plan.filter(f => f.status === 'failed');

  const nextFix = pending.length > 0 ? pending[0] : null;
  const allDone = pending.length === 0;

  // Check if the current batch just completed
  const currentBatch = fixItem.batchNumber;
  const remainingInBatch = plan.filter(
    f => f.batchNumber === currentBatch && f.status === 'pending',
  );
  const batchJustCompleted = remainingInBatch.length === 0;

  const result: Record<string, unknown> = {
    recorded: {
      fixId: input.fixId,
      status: input.status,
      findingId: fixItem.findingId,
    },
    progress: {
      total: plan.length,
      completed: completed.length,
      skipped: skipped.length,
      failed: failed.length,
      pending: pending.length,
      percentDone: Math.round(
        ((completed.length + skipped.length + failed.length) / plan.length) * 100,
      ),
    },
  };

  if (batchJustCompleted && !allDone) {
    result.batchCompleted = currentBatch;
    result.verifyHint = `Batch ${currentBatch} is complete. Run tests/lint now to verify before starting batch ${nextFix?.batchNumber}.`;
  }

  result.nextStep = allDone
    ? `All fixes processed! ${completed.length} completed, ${skipped.length} skipped, ${failed.length} failed. Call checkup_get_progress for final summary.`
    : `Next fix: ${nextFix!.id} (${nextFix!.findingId}): ${nextFix!.title}`;

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(result, null, 2),
    }],
  };
}
