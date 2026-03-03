import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ALL_PHASES } from '../lib/phase-config.js';
import { globalRules } from '../prompts/templates/global-rules.js';
import { findingFormat } from '../prompts/templates/finding-format.js';

/**
 * Register all MCP resources with the server.
 */
export function registerResources(server: McpServer): void {
  // Methodology resource
  server.resource(
    'methodology',
    'checkup://methodology',
    {
      description:
        'The complete Checkup audit methodology — severity scoring, finding format, cross-referencing rules',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'checkup://methodology',
          mimeType: 'text/markdown',
          text: `# Checkup Audit Methodology

${globalRules(0).replace('P0.', 'P[N].')}

## Phase Sequence

The 10 phases must run in order because each phase builds on findings from earlier phases:

${ALL_PHASES.map((p) => `- **${p.id}: ${p.name}** — ${p.description}`).join('\n')}

## Why This Order
- P1 (Dead Code) identifies code to ignore in all later phases
- P2 (Testing) calibrates severity — no tests = everything is higher risk
- P3-P9 perform the detailed analysis
- P10 (Synthesis) aggregates everything into an actionable roadmap

## Cross-Referencing
- Each finding gets an ID: P[phase].[number] (e.g., P3.2)
- Later phases reference earlier findings by ID
- The synthesis (P10) groups related findings across all phases
`,
        },
      ],
    }),
  );

  // Finding format resource
  server.resource(
    'finding-format',
    'checkup://finding-format',
    {
      description: 'The expected output format for audit findings',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'checkup://finding-format',
          mimeType: 'text/markdown',
          text: findingFormat('P[N]', '[Phase Title]'),
        },
      ],
    }),
  );

  // Phase overview resource
  server.resource(
    'phase-overview',
    'checkup://phase-overview',
    {
      description: 'Summary of all 10 audit phases with descriptions and dependencies',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'checkup://phase-overview',
          mimeType: 'text/markdown',
          text: `# Checkup Audit Phases

| Phase | Name | Description |
|-------|------|-------------|
${ALL_PHASES.map((p) => `| ${p.id} | ${p.name} | ${p.description} |`).join('\n')}

## Dependencies
- **P1** runs first — dead code identified here is excluded from all later phases
- **P2** calibrates risk — untested code gets higher severity in P3-P9
- **P3-P5** are sequential — logic gaps inform API and architecture analysis
- **P6-P9** can run in any order (independent of each other)
- **P10** runs last — synthesizes all findings into a roadmap
`,
        },
      ],
    }),
  );
}
