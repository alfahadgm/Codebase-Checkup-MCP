import { PhaseResult } from '../session/types.js';
import { ALL_PHASES } from './phase-config.js';
import {
  countFindings,
  extractSeverityCounts,
  extractEffortCounts,
  parseRemediationTable,
} from './cross-reference.js';

export interface AuditStatistics {
  totalFindings: number;
  bySeverity: { critical: number; high: number; medium: number };
  byPhase: Array<{ phaseId: string; phaseName: string; findingCount: number }>;
  byEffort: { quickFix: number; moderate: number; significantRefactor: number };
}

/**
 * Build the final aggregated report from all completed phase results.
 */
export function buildFinalReport(
  completedPhases: PhaseResult[],
  format: 'markdown' | 'json',
): { report: string; statistics: AuditStatistics; remediationRoadmap: string } {
  const statistics = computeStatistics(completedPhases);

  if (format === 'json') {
    const report = JSON.stringify(
      {
        phases: completedPhases.map((p) => ({
          phaseId: p.phaseId,
          findings: p.findings,
          completedAt: p.completedAt.toISOString(),
        })),
        statistics,
      },
      null,
      2,
    );

    return { report, statistics, remediationRoadmap: '' };
  }

  // Markdown format
  const phaseReports = completedPhases
    .map((p) => {
      return `---\n\n${p.findings}`;
    })
    .join('\n\n');

  const statsTable = buildStatisticsTable(statistics);

  const report = `# Checkup Audit Report

**Phases Completed:** ${completedPhases.length}
**Total Findings:** ${statistics.totalFindings}
**Critical:** ${statistics.bySeverity.critical} | **High:** ${statistics.bySeverity.high} | **Medium:** ${statistics.bySeverity.medium}

## Statistics

${statsTable}

## Phase Reports

${phaseReports}
`.trim();

  const remediationRoadmap = buildRemediationRoadmap(completedPhases, statistics);

  return { report, statistics, remediationRoadmap };
}

function computeStatistics(completedPhases: PhaseResult[]): AuditStatistics {
  let totalFindings = 0;
  const bySeverity = { critical: 0, high: 0, medium: 0 };
  const byPhase: AuditStatistics['byPhase'] = [];
  const byEffort = { quickFix: 0, moderate: 0, significantRefactor: 0 };

  for (const phase of completedPhases) {
    const count = countFindings(phase.phaseId, phase.findings);
    totalFindings += count;

    const phaseConfig = ALL_PHASES.find((p) => p.id === phase.phaseId);
    byPhase.push({
      phaseId: phase.phaseId,
      phaseName: phaseConfig?.name ?? phase.phaseId,
      findingCount: count,
    });

    const severity = extractSeverityCounts(phase.findings);
    bySeverity.critical += severity.critical;
    bySeverity.high += severity.high;
    bySeverity.medium += severity.medium;

    const effort = extractEffortCounts(phase.findings);
    byEffort.quickFix += effort.quickFix;
    byEffort.moderate += effort.moderate;
    byEffort.significantRefactor += effort.significantRefactor;
  }

  return { totalFindings, bySeverity, byPhase, byEffort };
}

function buildStatisticsTable(stats: AuditStatistics): string {
  const rows = stats.byPhase.map((p) => `| ${p.phaseId} | ${p.phaseName} | ${p.findingCount} |`);

  return `| Phase | Name | Findings |
|-------|------|----------|
${rows.join('\n')}
| **Total** | | **${stats.totalFindings}** |`;
}

interface RoadmapFinding {
  id: string;
  finding: string;
  impact: string;
  effort: string;
}

function buildRemediationRoadmap(completedPhases: PhaseResult[], stats: AuditStatistics): string {
  // Collect all parsed findings from remediation tables
  const allFindings: RoadmapFinding[] = [];
  for (const phase of completedPhases) {
    const parsed = parseRemediationTable(phase.findings);
    for (const row of parsed) {
      allFindings.push({
        id: row.id,
        finding: row.finding,
        impact: row.impact,
        effort: row.effort,
      });
    }
  }

  // If we have structured findings, build an adaptive roadmap
  if (allFindings.length > 0) {
    const critical = allFindings.filter((f) => {
      const impact = f.impact.toLowerCase();
      return (
        impact.includes('data loss') ||
        impact.includes('security breach') ||
        impact.includes('compliance')
      );
    });
    const high = allFindings.filter((f) => {
      const impact = f.impact.toLowerCase();
      return impact.includes('revenue loss') || impact.includes('user-blocking');
    });
    const medium = allFindings.filter((f) => {
      const impact = f.impact.toLowerCase();
      return (
        !impact.includes('data loss') &&
        !impact.includes('security breach') &&
        !impact.includes('compliance') &&
        !impact.includes('revenue loss') &&
        !impact.includes('user-blocking')
      );
    });

    const formatGroup = (items: RoadmapFinding[]): string => {
      if (items.length === 0) return '  _None_\n';
      return items.map((f) => `  - **${f.id}:** ${f.finding} — ${f.effort}`).join('\n') + '\n';
    };

    const quickWins = allFindings.filter((f) => {
      const effort = f.effort.toLowerCase();
      const impact = f.impact.toLowerCase();
      return (
        effort.includes('quick fix') &&
        (impact.includes('data loss') ||
          impact.includes('security breach') ||
          impact.includes('compliance') ||
          impact.includes('revenue loss') ||
          impact.includes('user-blocking'))
      );
    });

    let roadmap = `## Remediation Roadmap

### Immediate (Week 1) — Critical Issues (${critical.length})
${formatGroup(critical)}
### Short-term (Weeks 2-3) — High Issues (${high.length})
${formatGroup(high)}
### Medium-term (Month 2) — Other Issues (${medium.length})
${formatGroup(medium)}
### Effort Breakdown
- Quick Fix (< 1 day): ${stats.byEffort.quickFix} findings
- Moderate (1-3 days): ${stats.byEffort.moderate} findings
- Significant Refactor (3+ days): ${stats.byEffort.significantRefactor} findings`;

    if (quickWins.length > 0) {
      roadmap += `\n\n### Quick Wins (High Impact + Low Effort)
${quickWins.map((f) => `- **${f.id}:** ${f.finding}`).join('\n')}`;
    }

    roadmap += `\n\n**Recommended approach:** Start with Quick Wins above for maximum ROI, then work through Critical items.`;

    return roadmap;
  }

  // Fallback: generic template when no structured data is available
  return `## Remediation Priority

- **Critical issues (${stats.bySeverity.critical}):** Fix immediately — security breaches, data loss risks
- **High issues (${stats.bySeverity.high}):** Fix this sprint — user-blocking bugs, revenue impact
- **Medium issues (${stats.bySeverity.medium}):** Plan for next sprint — improvements and tech debt

### Effort Breakdown
- Quick Fix (< 1 day): ${stats.byEffort.quickFix} findings
- Moderate (1-3 days): ${stats.byEffort.moderate} findings
- Significant Refactor (3+ days): ${stats.byEffort.significantRefactor} findings

**Recommended approach:** Start with Quick Fix items that are Critical/High severity for maximum ROI.`;
}
