export interface ValidationWarning {
  code: string;
  message: string;
}

/**
 * Validate findings format and return non-blocking warnings.
 * The phase still completes even if warnings are present.
 */
export function validateFindings(phaseId: string, findings: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!findings.includes('## Remediation Table')) {
    warnings.push({
      code: 'MISSING_REMEDIATION_TABLE',
      message: `Findings for ${phaseId} are missing a "## Remediation Table" section. This will reduce the accuracy of the final report statistics and roadmap.`,
    });
  }

  const findingPattern = new RegExp(`${phaseId}\\.\\d+`, 'g');
  if (!findingPattern.test(findings)) {
    warnings.push({
      code: 'NO_FINDING_IDS',
      message: `No finding IDs (e.g., ${phaseId}.1) detected. Findings should use the format ${phaseId}.[number].`,
    });
  }

  if (
    findings.length < 100 &&
    !findings.toLowerCase().includes('no findings') &&
    !findings.toLowerCase().includes('skipped')
  ) {
    warnings.push({
      code: 'FINDINGS_TOO_SHORT',
      message: `Findings for ${phaseId} are unusually short (${findings.length} chars). This may indicate incomplete analysis.`,
    });
  }

  return warnings;
}
