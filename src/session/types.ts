export interface PhaseConfig {
  id: string;         // e.g., "P1"
  name: string;       // e.g., "Dead Code Detection"
  slug: string;       // e.g., "dead_code"
  description: string;
  order: number;
}

export interface PhaseResult {
  phaseId: string;
  findings: string;         // Raw markdown report from the LLM
  findingSummary: string;   // Compact summary for cross-referencing
  completedAt: Date;
}

// --- Fix execution types ---

export type FixPriority = 'critical' | 'high' | 'medium';
export type FixEffort = 'quick_fix' | 'moderate' | 'significant_refactor';
export type FixStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
export type SessionStatus = 'in_progress' | 'complete' | 'fixing' | 'fixes_complete';

export interface FixItem {
  id: string;              // e.g., "FIX-001"
  findingId: string;       // e.g., "P3.2" — back-link to audit finding
  phaseId: string;         // e.g., "P3"
  title: string;
  description: string;
  filePaths: string[];
  priority: FixPriority;
  effort: FixEffort;
  confidence: string;
  crossRefs: string[];
  status: FixStatus;
  batchNumber: number;     // Grouped by priority+effort tier
}

export interface FixResult {
  fixId: string;
  findingId: string;
  status: 'completed' | 'skipped' | 'failed';
  description: string;
  filesModified: string[];
  completedAt: Date;
}

export interface AuditSession {
  id: string;
  createdAt: Date;
  phases: PhaseConfig[];
  currentPhaseIndex: number;
  completedPhases: PhaseResult[];
  status: SessionStatus;
  // Fix execution state
  fixPlan?: FixItem[];
  fixResults: FixResult[];
  currentFixIndex: number;
}
