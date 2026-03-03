import { z } from 'zod';
import { getSession } from '../session/manager.js';
import { buildFinalReport } from '../lib/report-builder.js';

export const getReportSchema = z.object({
  sessionId: z
    .string()
    .describe('The session ID from checkup_start_audit.'),
  format: z
    .enum(['markdown', 'json'])
    .optional()
    .default('markdown')
    .describe('Output format: "markdown" (default) or "json".'),
});

export type GetReportInput = z.infer<typeof getReportSchema>;

export function handleGetReport(input: GetReportInput) {
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

  if (session.completedPhases.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: No phases have been completed yet. Run at least one phase before requesting a report.',
        },
      ],
      isError: true,
    };
  }

  const { report, statistics, remediationRoadmap } = buildFinalReport(
    session.completedPhases,
    input.format ?? 'markdown',
  );

  const result = {
    phasesCompleted: session.completedPhases.length,
    totalPhasesPlanned: session.phases.length,
    isPartialReport: session.status !== 'complete',
    statistics,
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
      {
        type: 'text' as const,
        text: `\n---\n\n${report}`,
      },
      ...(remediationRoadmap
        ? [{ type: 'text' as const, text: `\n---\n\n${remediationRoadmap}` }]
        : []),
    ],
  };
}
