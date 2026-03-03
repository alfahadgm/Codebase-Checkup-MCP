import { logger } from './logger.js';

export interface ParsedFinding {
  id: string;
  finding: string;
  impact: string;
  effort: string;
  confidence: string;
  crossRefs: string;
}

/**
 * Parse the remediation table from findings markdown into structured rows.
 * Returns empty array if no table found or table can't be parsed.
 */
export function parseRemediationTable(findings: string): ParsedFinding[] {
  const tableStart = findings.indexOf('## Remediation Table');
  if (tableStart === -1) return [];

  const tableSection = findings.slice(tableStart);
  const tableEnd = tableSection.indexOf('\n## ', 3);
  const table = tableEnd !== -1 ? tableSection.slice(0, tableEnd) : tableSection;

  const rows = table
    .split('\n')
    .filter((l) => l.startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('| id'));

  const parsed: ParsedFinding[] = [];
  for (const row of rows) {
    const cols = row
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cols.length >= 5) {
      parsed.push({
        id: cols[0],
        finding: cols[1],
        impact: cols[2],
        effort: cols[3],
        confidence: cols[4],
        crossRefs: cols[5] ?? '',
      });
    }
  }

  return parsed;
}

/**
 * Extract a compact cross-reference summary from a phase's findings.
 * This summary is injected into subsequent phase prompts to enable
 * cross-referencing without bloating the context.
 */
export function extractCrossRefSummary(phaseId: string, findings: string): string {
  const lines = findings.split('\n');
  const sections: string[] = [];

  // Extract the title
  const titleLine = lines.find((l) => l.startsWith('# '));
  if (titleLine) {
    sections.push(titleLine);
  }

  // Extract the remediation table (most compact summary of findings)
  const tableStart = findings.indexOf('## Remediation Table');
  if (tableStart !== -1) {
    const tableSection = findings.slice(tableStart);
    const tableEnd = tableSection.indexOf('\n## ', 3); // Find next section after the table
    const table = tableEnd !== -1 ? tableSection.slice(0, tableEnd) : tableSection;
    sections.push(table.trim());
  } else {
    // Fallback: extract finding headers with their metadata
    const findingHeaders: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^###\s+P\d+\.\d+:/.test(lines[i])) {
        findingHeaders.push(lines[i]);
        // Also grab the Impact/Effort/Confidence line if present
        if (i + 1 < lines.length && lines[i + 1].startsWith('**Impact:**')) {
          findingHeaders.push(lines[i + 1]);
        }
      }
    }
    if (findingHeaders.length > 0) {
      sections.push(`### Findings from ${phaseId}:`);
      sections.push(...findingHeaders);
    }
  }

  // If we got nothing useful, extract structured data or truncate
  if (sections.length <= 1) {
    logger.debug('Cross-ref: no table or headers found, using fallback', { phaseId });
    // Last-resort: pull any lines that look like finding headers
    const anyHeaders = lines.filter((l) => /^#{1,3}\s+/.test(l));
    if (anyHeaders.length > 1) {
      return `### ${phaseId} Summary\n${anyHeaders.join('\n')}`;
    }
    const truncated = findings.slice(0, 1500);
    return `### ${phaseId} Summary (truncated)\n${truncated}${findings.length > 1500 ? '\n...(truncated)' : ''}`;
  }

  return sections.join('\n\n');
}

/**
 * Count findings in a phase report by looking for finding ID patterns.
 */
export function countFindings(phaseId: string, findings: string): number {
  const pattern = new RegExp(`${phaseId}\\.\\d+`, 'g');
  const matches = findings.match(pattern);
  if (!matches) return 0;
  // Deduplicate (same ID appears in finding header + remediation table)
  return new Set(matches).size;
}

/**
 * Extract severity counts from remediation table by parsing the Impact column.
 */
export function extractSeverityCounts(findings: string): {
  critical: number;
  high: number;
  medium: number;
} {
  const counts = { critical: 0, high: 0, medium: 0 };
  const parsed = parseRemediationTable(findings);

  for (const row of parsed) {
    const impact = row.impact.toLowerCase();
    if (
      impact.includes('data loss') ||
      impact.includes('security breach') ||
      impact.includes('compliance')
    ) {
      counts.critical++;
    } else if (impact.includes('revenue loss') || impact.includes('user-blocking')) {
      counts.high++;
    } else {
      counts.medium++;
    }
  }

  return counts;
}

/**
 * Compress a cross-reference summary to just remediation table data rows.
 * Strips the title line, section headers, and column headers — keeps only `| ... |` data rows.
 * Falls back to finding ID lines (e.g., "P3.1: Missing null check") if no table rows found.
 */
export function compressSummaryToTableOnly(findingSummary: string): string {
  const lines = findingSummary.split('\n');

  // Extract table data rows (lines starting with | that aren't header/separator)
  const tableRows = lines.filter(
    (l) => l.startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('| id'),
  );

  if (tableRows.length > 0) {
    return tableRows.join('\n');
  }

  // Fallback: extract finding ID lines (e.g., "### P3.1: Missing null check")
  const findingIdLines = lines.filter((l) => /^###?\s+P\d+\.\d+:/.test(l));
  if (findingIdLines.length > 0) {
    return findingIdLines.join('\n');
  }

  // Last resort: return a trimmed version
  const trimmed = findingSummary.slice(0, 300);
  return trimmed + (findingSummary.length > 300 ? '...' : '');
}

/**
 * Compress a phase's findings to a one-liner with finding count and severity breakdown.
 * Example: "**P1:** 3 findings (2 critical, 1 high)"
 */
export function compressSummaryToOneLiner(phaseId: string, findings: string): string {
  const count = countFindings(phaseId, findings);
  const severity = extractSeverityCounts(findings);

  const parts: string[] = [];
  if (severity.critical > 0) parts.push(`${severity.critical} critical`);
  if (severity.high > 0) parts.push(`${severity.high} high`);
  if (severity.medium > 0) parts.push(`${severity.medium} medium`);

  const severityStr = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  return `**${phaseId}:** ${count} finding${count !== 1 ? 's' : ''}${severityStr}`;
}

/**
 * Extract effort counts from remediation table by parsing the Effort column.
 */
export function extractEffortCounts(findings: string): {
  quickFix: number;
  moderate: number;
  significantRefactor: number;
} {
  const counts = { quickFix: 0, moderate: 0, significantRefactor: 0 };
  const parsed = parseRemediationTable(findings);

  for (const row of parsed) {
    const effort = row.effort.toLowerCase();
    if (effort.includes('quick fix')) {
      counts.quickFix++;
    } else if (effort.includes('moderate')) {
      counts.moderate++;
    } else if (effort.includes('significant')) {
      counts.significantRefactor++;
    }
  }

  return counts;
}
