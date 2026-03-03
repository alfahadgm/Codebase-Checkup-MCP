import { z } from 'zod';
import { getSession, setFixPlan } from '../session/manager.js';
import { FixItem } from '../session/types.js';
import { extractFixPlan, getFixPlanSummary, formatFixPlanForPrompt } from '../lib/fix-planner.js';

export const getFixPlanSchema = z.object({
  sessionId: z
    .string()
    .describe('The session ID from checkup_start_audit.'),
  maxFixes: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of fixes to include. Defaults to 50.'),
  priorityFilter: z
    .enum(['all', 'critical', 'critical_and_high'])
    .optional()
    .default('all')
    .describe('Filter fixes by priority tier.'),
});

export type GetFixPlanInput = z.infer<typeof getFixPlanSchema>;

export function handleGetFixPlan(input: GetFixPlanInput) {
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

  // Idempotent: return existing plan if already generated
  if (session.fixPlan) {
    return buildResponse(session.id, session.fixPlan, true);
  }

  if (session.status === 'in_progress') {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: Audit is still in progress (${session.completedPhases.length}/${session.phases.length} phases complete). Complete the audit first.`,
      }],
      isError: true,
    };
  }

  let fixItems = extractFixPlan(session.completedPhases);

  // Apply priority filter
  if (input.priorityFilter === 'critical') {
    fixItems = fixItems.filter(f => f.priority === 'critical');
  } else if (input.priorityFilter === 'critical_and_high') {
    fixItems = fixItems.filter(f => f.priority === 'critical' || f.priority === 'high');
  }

  // Apply max limit
  const max = input.maxFixes ?? 50;
  if (fixItems.length > max) {
    fixItems = fixItems.slice(0, max);
  }

  // Re-number after filtering
  fixItems.forEach((f, i) => {
    f.id = `FIX-${String(i + 1).padStart(3, '0')}`;
  });

  // Store in session
  const updated = setFixPlan(input.sessionId, fixItems);
  if (!updated) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: Could not set fix plan. Session status is "${session.status}" — fix plan requires a completed audit.`,
      }],
      isError: true,
    };
  }

  return buildResponse(session.id, fixItems, false);
}

function buildResponse(sessionId: string, fixItems: FixItem[], alreadyGenerated: boolean) {
  const summary = getFixPlanSummary(fixItems);
  const nextStep = fixItems.length > 0
    ? `Apply fixes in order, starting with ${fixItems[0].id}: ${fixItems[0].title}. After each fix, call checkup_record_fix.`
    : 'No actionable fixes found. The codebase looks clean based on audit findings.';

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          sessionId,
          alreadyGenerated,
          totalFixes: fixItems.length,
          summary,
          nextStep,
        }, null, 2),
      },
      {
        type: 'text' as const,
        text: formatFixPlanForPrompt(fixItems),
      },
    ],
  };
}
