import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p06ErrorHandlingPrompt(args: PhasePromptArgs): string {
  return `
# P6: Error Handling & Fault Tolerance

${globalRules(6)}

## Your Task

Audit the completeness and correctness of error handling across the codebase. Poor error handling is the leading cause of cascading failures, data corruption, and poor user experience.

### What to Look For

1. **Missing Error Handling**
   - Async operations (promises, async/await) without catch handlers
   - File I/O, network calls, or database operations without try/catch
   - Event emitters without error event listeners
   - Missing error boundaries in React/UI component trees
   - Child process spawning without error handling

2. **Swallowed Errors**
   - Empty catch blocks (\`catch (e) {}\`)
   - Catch blocks that only log but don't propagate or recover
   - Error handlers that return success status despite failure
   - Promise chains with .catch() that silently continue

3. **Incorrect Error Propagation**
   - Errors caught and re-thrown without context (losing stack trace)
   - Generic error messages that hide the actual problem
   - Mixing error types (throwing strings instead of Error objects)
   - Inconsistent error response shapes across API endpoints

4. **Missing Graceful Degradation**
   - No fallback behavior when external services fail
   - Missing circuit breaker patterns for unreliable dependencies
   - No timeout on operations that could hang indefinitely
   - Missing health checks or readiness probes
   - No retry logic with backoff for transient failures

5. **Resource Cleanup**
   - Database connections not closed on error
   - File handles not released in error paths
   - Temporary files not cleaned up on failure
   - Event listeners not removed on component/process teardown
   - Missing \`finally\` blocks for cleanup that must always run

6. **Error Logging & Monitoring**
   - Errors not logged or logged without sufficient context
   - Missing structured error logging (just console.log instead of proper logger)
   - No error tracking integration (Sentry, Datadog, etc.)
   - Sensitive data logged in error messages (passwords, tokens, PII)

### How to Explore

1. Search for try/catch blocks and assess their completeness
2. Search for async functions and verify error handling
3. Look for Promise usage without .catch()
4. Check API response handlers for error cases
5. Review database and I/O operations for cleanup patterns

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude dead code from P1. Cross-reference with API issues from P4 and logic gaps from P3.` : ''}

${findingFormat('P6', 'Error Handling & Fault Tolerance')}
`.trim();
}
