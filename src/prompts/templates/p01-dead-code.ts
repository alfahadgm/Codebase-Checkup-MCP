import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';

export interface PhasePromptArgs {
  priorFindings?: string;
}

export function p01DeadCodePrompt(args: PhasePromptArgs): string {
  return `
# P1: Dead Code Detection

${globalRules(1)}

## Your Task

Perform a comprehensive dead code analysis of the codebase. Dead code wastes maintainer time, inflates bundle sizes, and creates false confidence in coverage metrics.

### What to Look For

1. **Unused Exports**
   - Functions, classes, constants, or types that are exported but never imported anywhere
   - Use grep/search for each export name across the codebase to verify usage

2. **Orphaned Files**
   - Files that are not imported by any other file in the project
   - Check for files that were part of a removed feature but left behind
   - Look for test files testing functions/components that no longer exist

3. **Dead Branches**
   - \`if\` branches with conditions that are always true or always false
   - Feature flags that have been permanently enabled or disabled
   - Environment checks for environments that no longer exist

4. **Unreachable Code**
   - Code after \`return\`, \`throw\`, \`break\`, or \`continue\` statements
   - Functions that are defined but never called (even if not exported)
   - Event handlers attached to elements that don't exist

5. **Commented-Out Code**
   - Large blocks of commented-out code (not documentation comments)
   - TODO/FIXME comments referencing code that should have been removed

6. **Unused Dependencies**
   - npm/pip/cargo packages listed in manifest but never imported
   - Dev dependencies that aren't used in any script or config

### How to Explore

1. Start by mapping the project structure: list all source files
2. Identify entry points (main files, route handlers, exported modules)
3. Trace the dependency graph from entry points inward
4. Search for each export and verify it has at least one consumer
5. Check for files not referenced by any import statement

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}` : ''}

${findingFormat('P1', 'Dead Code Detection')}

**Important:** Findings from this phase will be used by ALL subsequent phases. Code identified as dead here will be excluded from later analysis, so be thorough and accurate.
`.trim();
}
