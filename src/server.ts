import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startAuditSchema, handleStartAudit } from './tools/start-audit.js';
import { nextPhaseSchema, handleNextPhase } from './tools/next-phase.js';
import { getReportSchema, handleGetReport } from './tools/get-report.js';
import { skipPhaseSchema, handleSkipPhase } from './tools/skip-phase.js';
import { getStatusSchema, handleGetStatus } from './tools/get-status.js';
import { listSessionsSchema, handleListSessions } from './tools/list-sessions.js';
import { getFixPlanSchema, handleGetFixPlan } from './tools/get-fix-plan.js';
import { recordFixSchema, handleRecordFix } from './tools/record-fix.js';
import { getProgressSchema, handleGetProgress } from './tools/get-progress.js';
import { registerPrompts } from './prompts/registry.js';
import { registerResources } from './resources/registry.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'checkup-mcp',
    version: '1.0.0',
  });

  // Register tools
  server.tool(
    'checkup_start_audit',
    'Start or resume a codebase audit session. Returns the first (or current) phase prompt. Supports resuming via resumeSessionId.',
    startAuditSchema.shape,
    async (args) => handleStartAudit(args),
  );

  server.tool(
    'checkup_next_phase',
    'Submit findings for the current phase and get the next phase prompt. Call this after completing each audit phase.',
    nextPhaseSchema.shape,
    async (args) => handleNextPhase(args),
  );

  server.tool(
    'checkup_skip_phase',
    'Skip the current phase when it is not applicable (e.g., UX phases on a backend-only project). Advances to the next phase.',
    skipPhaseSchema.shape,
    async (args) => handleSkipPhase(args),
  );

  server.tool(
    'checkup_get_report',
    'Get the final aggregated audit report with statistics and remediation roadmap. Call after all phases are complete (or for a partial report).',
    getReportSchema.shape,
    async (args) => handleGetReport(args),
  );

  server.tool(
    'checkup_get_status',
    'Check the current status of an audit session — which phases are done, which is next, and overall progress.',
    getStatusSchema.shape,
    async (args) => handleGetStatus(args),
  );

  server.tool(
    'checkup_list_sessions',
    'List all active audit sessions. Useful for resuming an audit after losing the session ID.',
    listSessionsSchema.shape,
    async () => handleListSessions(),
  );

  // Fix execution tools
  server.tool(
    'checkup_get_fix_plan',
    'Generate a prioritized fix plan from audit findings. Call after audit is complete. Returns structured fix items grouped by priority and effort.',
    getFixPlanSchema.shape,
    async (args) => handleGetFixPlan(args),
  );

  server.tool(
    'checkup_record_fix',
    'Record that a fix was applied, skipped, or failed. Call after attempting each fix from the fix plan.',
    recordFixSchema.shape,
    async (args) => handleRecordFix(args),
  );

  server.tool(
    'checkup_get_progress',
    'Get comprehensive progress summary including audit phases and fix execution status. Useful for re-orientation after context clearing.',
    getProgressSchema.shape,
    async (args) => handleGetProgress(args),
  );

  // Register prompts and resources
  registerPrompts(server);
  registerResources(server);

  return server;
}
