import { z } from 'zod';
import { getSession, getFixProgress } from '../session/manager.js';
import {
  countFindings,
  extractSeverityCounts,
  parseRemediationTable,
} from '../lib/cross-reference.js';

export const compactContextSchema = z.object({
  sessionId: z.string().describe('The session ID to get compact context for.'),
});

export type CompactContextInput = z.infer<typeof compactContextSchema>;

interface PhaseSummary {
  phaseId: string;
  findingCount: number;
  critical: number;
  high: number;
  medium: number;
  topFindings: string[];
}

function buildPhaseSummary(phaseId: string, findings: string): PhaseSummary {
  const findingCount = countFindings(phaseId, findings);
  const severity = extractSeverityCounts(findings);

  // Extract top finding titles from remediation table
  const parsed = parseRemediationTable(findings);
  const topFindings = parsed.slice(0, 3).map((row) => `${row.id}: ${row.finding}`);

  return {
    phaseId,
    findingCount,
    critical: severity.critical,
    high: severity.high,
    medium: severity.medium,
    topFindings,
  };
}

export function handleCompactContext(input: CompactContextInput) {
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

  const completedSummary = session.completedPhases.map((p) =>
    buildPhaseSummary(p.phaseId, p.findings),
  );

  const currentPhase =
    session.currentPhaseIndex < session.phases.length
      ? {
          id: session.phases[session.currentPhaseIndex].id,
          name: session.phases[session.currentPhaseIndex].name,
        }
      : null;

  const remainingPhases = session.phases.slice(session.currentPhaseIndex).map((p) => p.id);

  const totalFindings = completedSummary.reduce((sum, p) => sum + p.findingCount, 0);
  const totalCritical = completedSummary.reduce((sum, p) => sum + p.critical, 0);

  // Include fix progress if applicable
  let fixProgress = null;
  if (session.status === 'fixing' || session.status === 'fixes_complete') {
    const progress = getFixProgress(input.sessionId);
    if (progress) {
      fixProgress = {
        totalFixes: progress.totalFixes,
        completed: progress.completedFixes,
        skipped: progress.skippedFixes,
        failed: progress.failedFixes,
        pending: progress.pendingFixes,
      };
    }
  }

  const guidance = currentPhase
    ? `Continue with ${currentPhase.id}: ${currentPhase.name}. ${totalFindings} findings so far${totalCritical > 0 ? `, ${totalCritical} critical` : ''}.`
    : 'All phases complete. Generate the report or fix plan.';

  const result = {
    sessionId: input.sessionId,
    status: session.status,
    completedSummary,
    currentPhase,
    remainingPhases,
    fixProgress,
    guidance,
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
