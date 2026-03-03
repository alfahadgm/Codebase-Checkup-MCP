import {
  AuditSession, PhaseConfig, PhaseResult,
  FixItem, FixResult, SessionStatus,
} from './types.js';
import { buildFindingSummary } from '../lib/prompt-builder.js';
import { logger } from '../lib/logger.js';

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

let sessionCounter = 0;

function generateSessionId(): string {
  sessionCounter++;
  const ts = Date.now().toString(36);
  return `checkup-${ts}-${sessionCounter}`;
}

const sessions = new Map<string, AuditSession>();

/**
 * Create a new audit session.
 */
export function createSession(phases: PhaseConfig[]): AuditSession {
  cleanExpiredSessions();

  const session: AuditSession = {
    id: generateSessionId(),
    createdAt: new Date(),
    phases,
    currentPhaseIndex: 0,
    completedPhases: [],
    status: 'in_progress',
    fixResults: [],
    currentFixIndex: 0,
  };

  sessions.set(session.id, session);
  logger.info('Session created', { sessionId: session.id, phaseCount: phases.length });
  return session;
}

/**
 * Get a session by ID.
 */
export function getSession(sessionId: string): AuditSession | undefined {
  cleanExpiredSessions();
  return sessions.get(sessionId);
}

/**
 * Complete a phase and advance to the next one.
 * Returns the updated session.
 */
export function completePhase(
  sessionId: string,
  completedPhaseId: string,
  findings: string,
): AuditSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const currentPhase = session.phases[session.currentPhaseIndex];
  if (!currentPhase || currentPhase.id.toUpperCase() !== completedPhaseId.toUpperCase()) {
    return undefined;
  }

  const phaseResult: PhaseResult = {
    phaseId: currentPhase.id,
    findings,
    findingSummary: buildFindingSummary(completedPhaseId.toUpperCase(), findings),
    completedAt: new Date(),
  };

  session.completedPhases.push(phaseResult);
  session.currentPhaseIndex++;

  if (session.currentPhaseIndex >= session.phases.length) {
    session.status = 'complete';
  }

  return session;
}

/**
 * Skip a phase without findings, advancing to the next one.
 */
export function skipPhase(
  sessionId: string,
  phaseId: string,
  reason: string,
): AuditSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const currentPhase = session.phases[session.currentPhaseIndex];
  if (!currentPhase || currentPhase.id.toUpperCase() !== phaseId.toUpperCase()) {
    return undefined;
  }

  const phaseResult: PhaseResult = {
    phaseId: phaseId.toUpperCase(),
    findings: `Skipped: ${reason}`,
    findingSummary: `### ${phaseId.toUpperCase()}: Skipped\n_${reason}_`,
    completedAt: new Date(),
  };

  session.completedPhases.push(phaseResult);
  session.currentPhaseIndex++;

  if (session.currentPhaseIndex >= session.phases.length) {
    session.status = 'complete';
  }

  return session;
}

/**
 * List all active (non-expired) sessions with summary info.
 */
export function listSessions(): Array<{
  id: string;
  status: AuditSession['status'];
  createdAt: Date;
  currentPhaseIndex: number;
  totalPhases: number;
  completedPhaseCount: number;
}> {
  cleanExpiredSessions();
  return Array.from(sessions.values()).map(s => ({
    id: s.id,
    status: s.status,
    createdAt: s.createdAt,
    currentPhaseIndex: s.currentPhaseIndex,
    totalPhases: s.phases.length,
    completedPhaseCount: s.completedPhases.length,
  }));
}

/**
 * Transition session to fix mode. Sets the fix plan and updates status.
 */
export function setFixPlan(
  sessionId: string,
  fixPlan: FixItem[],
): AuditSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  if (session.status !== 'complete') return undefined;

  session.fixPlan = fixPlan;
  session.fixResults = [];
  session.currentFixIndex = 0;
  session.status = 'fixing';
  // Reset TTL so fix phase gets a fresh 2-hour window
  session.createdAt = new Date();

  logger.info('Fix plan set', {
    sessionId,
    fixCount: fixPlan.length,
    batches: fixPlan.length > 0 ? Math.max(...fixPlan.map(f => f.batchNumber)) : 0,
  });
  return session;
}

/**
 * Record a fix result (completed, skipped, or failed).
 * Advances currentFixIndex. Marks fixes_complete when all done.
 */
export function recordFix(
  sessionId: string,
  fixId: string,
  result: Omit<FixResult, 'completedAt'>,
): AuditSession | undefined {
  const session = sessions.get(sessionId);
  if (!session || !session.fixPlan) return undefined;

  const fixItem = session.fixPlan.find(f => f.id === fixId);
  if (!fixItem) return undefined;

  fixItem.status = result.status;

  const fixResult: FixResult = {
    ...result,
    completedAt: new Date(),
  };
  session.fixResults.push(fixResult);

  // Advance past all non-pending items
  while (
    session.currentFixIndex < session.fixPlan.length &&
    session.fixPlan[session.currentFixIndex].status !== 'pending'
  ) {
    session.currentFixIndex++;
  }

  const allDone = session.fixPlan.every(
    f => f.status === 'completed' || f.status === 'skipped' || f.status === 'failed',
  );
  if (allDone) {
    session.status = 'fixes_complete';
  }

  logger.info('Fix recorded', {
    sessionId,
    fixId,
    status: result.status,
    remaining: session.fixPlan.filter(f => f.status === 'pending').length,
  });
  return session;
}

/**
 * Get a summary of fix progress for a session.
 */
export function getFixProgress(sessionId: string): {
  auditStatus: SessionStatus;
  auditPhasesCompleted: number;
  auditPhasesTotal: number;
  fixPlanGenerated: boolean;
  totalFixes: number;
  completedFixes: number;
  skippedFixes: number;
  failedFixes: number;
  pendingFixes: number;
  currentFix: FixItem | null;
  currentBatch: number;
  totalBatches: number;
} | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const fixPlan = session.fixPlan ?? [];
  const pending = fixPlan.filter(f => f.status === 'pending').length;
  const completed = fixPlan.filter(f => f.status === 'completed').length;
  const skipped = fixPlan.filter(f => f.status === 'skipped').length;
  const failed = fixPlan.filter(f => f.status === 'failed').length;
  const currentFix = session.currentFixIndex < fixPlan.length
    ? fixPlan[session.currentFixIndex]
    : null;
  const totalBatches = fixPlan.length > 0
    ? Math.max(...fixPlan.map(f => f.batchNumber))
    : 0;
  const currentBatch = currentFix?.batchNumber ?? totalBatches;

  return {
    auditStatus: session.status,
    auditPhasesCompleted: session.completedPhases.length,
    auditPhasesTotal: session.phases.length,
    fixPlanGenerated: !!session.fixPlan,
    totalFixes: fixPlan.length,
    completedFixes: completed,
    skippedFixes: skipped,
    failedFixes: failed,
    pendingFixes: pending,
    currentFix,
    currentBatch,
    totalBatches,
  };
}

/**
 * Clean up expired sessions.
 */
function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt.getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
      logger.info('Session expired', { sessionId: id });
    }
  }
}
