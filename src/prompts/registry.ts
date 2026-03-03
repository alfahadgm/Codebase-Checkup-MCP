import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ALL_PHASES } from '../lib/phase-config.js';
import { PHASE_PROMPTS } from './templates/index.js';
import { autonomousWorkflowPrompt } from './templates/autonomous-workflow.js';

/**
 * Register all MCP prompts with the server.
 */
export function registerPrompts(server: McpServer): void {
  // Individual phase prompts (P1-P10)
  for (const phase of ALL_PHASES) {
    const promptFn = PHASE_PROMPTS[phase.id];
    if (!promptFn) continue;

    server.prompt(
      `checkup-${phase.id.toLowerCase()}`,
      `${phase.id}: ${phase.name} — ${phase.description}`,
      {},
      () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptFn({}),
            },
          },
        ],
      }),
    );
  }

  // Full audit prompt — instructs the LLM on how to use the 3 tools
  server.prompt(
    'checkup-full-audit',
    'Run a full 10-phase codebase audit using the checkup tools',
    {},
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Full Codebase Audit — Autonomous Mode

You MUST run this audit to completion without stopping to ask the user for confirmation between phases.

## Workflow

1. **Start** — Call \`checkup_start_audit\` (no parameters needed for a full audit)
2. **For each phase:**
   - Read the audit prompt carefully
   - **If the phase is not applicable** (e.g., UX phases on a backend-only project): Call \`checkup_skip_phase\` with a reason and move on immediately
   - Otherwise, explore the codebase thoroughly using your file-reading tools
   - Produce a complete findings report following the specified format — **always include the Remediation Table**
   - Call \`checkup_next_phase\` with your findings
   - Check the response for any \`warnings\` — if present, keep them in mind for future phases
   - **DO NOT** pause between phases. **DO NOT** ask the user if they want to continue.
3. **When all phases are complete** (\`isComplete: true\`) — Immediately call \`checkup_get_report\` to get the final aggregated report

## The 10 Phases
${ALL_PHASES.map((p) => `- **${p.id}:** ${p.name}`).join('\n')}

## Context Management
- Each phase's findings should be 500-2000 words — focus on Critical/High findings, not exhaustive catalogs
- If you are approaching your context limit, note the session ID and tell the user to resume with \`checkup_start_audit({ resumeSessionId: "<session-id>" })\`
- You can also call \`checkup_list_sessions\` to discover active sessions for resume
- The server stores all your findings, so nothing is lost when you resume

## Critical Rules
- Be thorough: read actual source files, don't guess from filenames
- Every finding must cite specific file paths, function names, and line numbers
- Follow the finding format provided in each phase's prompt (including the Remediation Table)
- Cross-reference related findings across phases using finding IDs (e.g., "See P1.3")
- Continue autonomously through ALL phases without user interaction

Start now by calling \`checkup_start_audit\`.`,
          },
        },
      ],
    }),
  );

  // Autonomous workflow prompt — Plan → Audit → Fix → Verify
  server.prompt(
    'checkup-autonomous',
    'Run a complete autonomous workflow: Plan the audit, run all 10 phases, apply prioritized fixes, and verify with tests. No user interaction needed.',
    {},
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: autonomousWorkflowPrompt(),
          },
        },
      ],
    }),
  );
}
