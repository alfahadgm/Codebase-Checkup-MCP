import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ALL_PHASES } from '../lib/phase-config.js';
import { PHASE_PROMPTS } from './templates/index.js';
import { autonomousWorkflowPrompt } from './templates/autonomous-workflow.js';
import { fixWorkflowPrompt } from './templates/fix-workflow.js';

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
- Prioritize Critical/High findings but include all that are relevant — do not artificially limit findings count
- **Do NOT repeat prior phase findings** in your analysis — the server injects cross-references into each phase prompt automatically
- After completing each phase, move directly to the next without summarizing
- If running low on context, call \`checkup_compact_context\` for a minimal summary of all prior work
- If approaching your context limit, note the session ID and tell the user to resume with \`checkup_start_audit({ resumeSessionId: "<session-id>" })\`
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

  // Autonomous workflow prompt — Plan → Audit → Handoff
  server.prompt(
    'checkup-autonomous',
    'Run a full autonomous audit: Plan, run all 10 phases, then hand off a session ID for fixes in a new conversation via checkup-fix.',
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

  // Fix workflow prompt — runs in a new conversation after the audit
  server.prompt(
    'checkup-fix',
    'Apply fixes from a completed audit. Provide the session ID from checkup-autonomous. Starts a new conversation with clean context.',
    {
      sessionId: z
        .string()
        .describe(
          'The session ID from the completed audit (printed at the end of checkup-autonomous).',
        ),
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: fixWorkflowPrompt(args.sessionId),
          },
        },
      ],
    }),
  );
}
