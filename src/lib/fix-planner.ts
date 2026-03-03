import { PhaseResult, FixItem, FixPriority, FixEffort } from '../session/types.js';
import { parseRemediationTable, ParsedFinding } from './cross-reference.js';
import { logger } from './logger.js';

/**
 * Extract actionable fix items from completed audit phase results.
 * Returns a prioritized, batched list of FixItems.
 */
export function extractFixPlan(completedPhases: PhaseResult[]): FixItem[] {
  const allParsedFindings: Array<ParsedFinding & { phaseId: string }> = [];

  for (const phase of completedPhases) {
    // Skip P10 synthesis — it aggregates, doesn't produce new fixes
    if (phase.phaseId === 'P10') continue;
    // Skip skipped phases
    if (phase.findings.startsWith('Skipped:')) continue;

    const parsed = parseRemediationTable(phase.findings);
    for (const finding of parsed) {
      allParsedFindings.push({ ...finding, phaseId: phase.phaseId });
    }
  }

  if (allParsedFindings.length === 0) {
    logger.warn('No structured findings found for fix plan extraction');
    return [];
  }

  const fixItems: FixItem[] = allParsedFindings.map((f, index) => ({
    id: `FIX-${String(index + 1).padStart(3, '0')}`,
    findingId: f.id,
    phaseId: f.phaseId,
    title: f.finding,
    description: f.finding,
    filePaths: extractFilePathsFromFinding(f),
    priority: classifyPriority(f.impact),
    effort: classifyEffort(f.effort),
    confidence: f.confidence,
    crossRefs: parseCrossRefs(f.crossRefs),
    status: 'pending' as const,
    batchNumber: 0,
  }));

  sortByPriorityAndEffort(fixItems);
  assignBatches(fixItems);

  return fixItems;
}

function classifyPriority(impact: string): FixPriority {
  const lower = impact.toLowerCase();
  if (
    lower.includes('data loss') ||
    lower.includes('security breach') ||
    lower.includes('compliance')
  ) {
    return 'critical';
  }
  if (lower.includes('revenue loss') || lower.includes('user-blocking')) {
    return 'high';
  }
  return 'medium';
}

function classifyEffort(effort: string): FixEffort {
  const lower = effort.toLowerCase();
  if (lower.includes('quick fix')) return 'quick_fix';
  if (lower.includes('moderate')) return 'moderate';
  return 'significant_refactor';
}

function extractFilePathsFromFinding(finding: ParsedFinding): string[] {
  const pathRegex = /`([a-zA-Z0-9_\-./\\]+\.[a-zA-Z]+(?::\d+)?)`/g;
  const paths: string[] = [];
  let match;
  while ((match = pathRegex.exec(finding.finding)) !== null) {
    paths.push(match[1].replace(/:\d+$/, ''));
  }
  return [...new Set(paths)];
}

function parseCrossRefs(crossRefStr: string): string[] {
  if (!crossRefStr || crossRefStr.trim() === '' || crossRefStr.trim() === '—') {
    return [];
  }
  const matches = crossRefStr.match(/P\d+\.\d+/g);
  return matches ?? [];
}

const PRIORITY_ORDER: Record<FixPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const EFFORT_ORDER: Record<FixEffort, number> = {
  quick_fix: 0,
  moderate: 1,
  significant_refactor: 2,
};

function sortByPriorityAndEffort(items: FixItem[]): void {
  items.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort];
  });
}

/**
 * Assign batch numbers based on priority+effort tier boundaries.
 * Batch 1: critical/quick_fix, Batch 2: critical/moderate, etc.
 */
function assignBatches(items: FixItem[]): void {
  if (items.length === 0) return;

  let batchNum = 1;
  let currentPriority: FixPriority | null = null;
  let currentEffortGroup: 'quick' | 'other' | null = null;

  for (const item of items) {
    const effortGroup: 'quick' | 'other' =
      item.effort === 'quick_fix' ? 'quick' : 'other';

    if (item.priority !== currentPriority || effortGroup !== currentEffortGroup) {
      if (currentPriority !== null) batchNum++;
      currentPriority = item.priority;
      currentEffortGroup = effortGroup;
    }
    item.batchNumber = batchNum;
  }
}

/**
 * Get a compact summary of the fix plan for prompt injection.
 */
export function getFixPlanSummary(fixItems: FixItem[]): string {
  const byCritical = fixItems.filter(f => f.priority === 'critical');
  const byHigh = fixItems.filter(f => f.priority === 'high');
  const byMedium = fixItems.filter(f => f.priority === 'medium');
  const totalBatches = fixItems.length > 0
    ? Math.max(...fixItems.map(f => f.batchNumber))
    : 0;

  return [
    `Fix Plan: ${fixItems.length} total fixes in ${totalBatches} batches`,
    `- Critical: ${byCritical.length} (${byCritical.filter(f => f.effort === 'quick_fix').length} quick fixes)`,
    `- High: ${byHigh.length} (${byHigh.filter(f => f.effort === 'quick_fix').length} quick fixes)`,
    `- Medium: ${byMedium.length} (${byMedium.filter(f => f.effort === 'quick_fix').length} quick fixes)`,
  ].join('\n');
}

/**
 * Format fix plan as a readable markdown string for prompt injection.
 */
export function formatFixPlanForPrompt(fixItems: FixItem[]): string {
  if (fixItems.length === 0) {
    return '\n---\n\nNo fixes to apply.';
  }

  const totalBatches = Math.max(...fixItems.map(f => f.batchNumber));
  const batches: string[] = [];

  for (let b = 1; b <= totalBatches; b++) {
    const batchItems = fixItems.filter(f => f.batchNumber === b);
    if (batchItems.length === 0) continue;

    const priority = batchItems[0].priority;
    const effort = batchItems[0].effort;
    const batchLabel = `Batch ${b}: ${priority.toUpperCase()} / ${effort.replace(/_/g, ' ')}`;

    const items = batchItems.map(f =>
      `  - **${f.id}** (${f.findingId}): ${f.title}\n    Files: ${f.filePaths.length > 0 ? f.filePaths.join(', ') : '(determine from finding)'}\n    Effort: ${f.effort.replace(/_/g, ' ')} | Confidence: ${f.confidence}${f.crossRefs.length > 0 ? `\n    Cross-refs: ${f.crossRefs.join(', ')}` : ''}`,
    );

    batches.push(`### ${batchLabel}\n${items.join('\n')}`);
  }

  return `\n---\n\n## Fix Plan\n\n${batches.join('\n\n')}`;
}
