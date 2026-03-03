import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p02TestingPrompt(args: PhasePromptArgs): string {
  return `
# P2: Testing Coverage Analysis

${globalRules(2)}

## Your Task

Analyze the testing strategy and coverage of the codebase. Untested code is unverified code — testing gaps directly increase the risk severity of ALL subsequent findings.

### What to Look For

1. **Missing Test Types**
   - Are there unit tests? Integration tests? E2E tests?
   - Which layers of the app have zero test coverage?
   - Are there snapshot tests that are never updated (always passing but meaningless)?

2. **Critical Untested Paths**
   - Authentication and authorization flows
   - Payment/billing/financial calculations
   - Data mutation endpoints (POST, PUT, DELETE)
   - Error handling paths (what happens when things fail?)
   - Edge cases: empty inputs, max values, concurrent access

3. **Test Quality Issues**
   - Tests that never assert anything meaningful (always-pass tests)
   - Tests with hardcoded expected values that don't match current code
   - Mocked dependencies that don't match real implementations
   - Tests that pass individually but fail together (shared state)
   - Flaky tests (timing-dependent, order-dependent)

4. **Configuration & Infrastructure**
   - Missing test configuration (jest.config, vitest.config, pytest.ini, etc.)
   - No CI/CD test pipeline or tests not running in CI
   - Missing test environment setup (test databases, fixtures, seeds)

5. **Test-to-Code Ratio**
   - Identify modules with zero tests vs well-tested modules
   - Flag business-critical modules with no test coverage

### How to Explore

1. Find test directories and test files (look for __tests__, *.test.*, *.spec.*, tests/, test/)
2. Check test configuration files
3. Map which source files have corresponding test files and which don't
4. Read test files to assess quality — do they actually test meaningful behavior?
5. Check package.json/Makefile for test scripts

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude any dead code identified in P1 from your analysis.` : ''}

${findingFormat('P2', 'Testing Coverage Analysis')}

**Important:** Testing gaps found here calibrate severity for ALL subsequent phases. A finding in P3-P9 is higher severity if the affected code has no tests.
`.trim();
}
