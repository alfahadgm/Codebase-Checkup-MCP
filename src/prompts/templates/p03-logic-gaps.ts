import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p03LogicGapsPrompt(args: PhasePromptArgs): string {
  return `
# P3: Logic Gaps & Business Logic

${globalRules(3)}

## Your Task

Identify business logic errors, missing validations, incorrect state transitions, and edge cases that could cause data corruption, incorrect behavior, or security vulnerabilities.

### What to Look For

1. **Missing Input Validation**
   - User inputs accepted without sanitization or type checking
   - Missing boundary checks (negative numbers, empty strings, null values)
   - SQL/NoSQL injection vectors from unsanitized inputs
   - Missing file upload validation (size, type, content)

2. **Incorrect State Transitions**
   - State machines that allow invalid transitions (e.g., "cancelled" → "active")
   - Missing guards on status changes
   - Race conditions in concurrent state updates
   - Optimistic updates without rollback on failure

3. **Business Rule Violations**
   - Calculations that could produce negative values where only positive make sense
   - Price/quantity/amount calculations without proper decimal handling
   - Date/time logic that ignores timezones or DST transitions
   - Permissions checks that are incomplete or bypassable

4. **Edge Cases**
   - Division by zero possibilities
   - Array operations on potentially empty arrays
   - String operations on potentially null/undefined values
   - Integer overflow in counters or calculations
   - Off-by-one errors in loops or pagination

5. **Data Integrity**
   - Missing database constraints that code relies on
   - Writes that could leave data in an inconsistent state
   - Missing cascading deletes/updates
   - Transactions that should be atomic but aren't

6. **Race Conditions**
   - Check-then-act patterns without locking
   - Double-submit vulnerabilities in forms
   - Concurrent writes to the same resource without conflict resolution
   - Stale reads in read-modify-write patterns

### How to Explore

1. Identify the core business logic files (models, services, controllers, handlers)
2. Trace data flow from input to storage and back
3. Look for validation at system boundaries (API handlers, form submissions)
4. Check for proper error propagation in business logic chains
5. Review state management code for completeness

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude dead code from P1. Flag findings as higher severity if the affected code has no tests (P2).` : ''}

${findingFormat('P3', 'Logic Gaps & Business Logic')}
`.trim();
}
