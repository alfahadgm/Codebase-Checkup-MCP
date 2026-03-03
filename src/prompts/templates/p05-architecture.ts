import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p05ArchitecturePrompt(args: PhasePromptArgs): string {
  return `
# P5: System Architecture Review

${globalRules(5)}

## Your Task

Review the system's architectural patterns, dependency structure, separation of concerns, scalability characteristics, and accumulated technical debt.

### What to Look For

1. **Dependency Structure**
   - Circular dependencies between modules
   - God modules that everything depends on (high fan-in)
   - Modules that depend on everything (high fan-out)
   - Tight coupling between layers that should be independent
   - Missing dependency injection where it would improve testability

2. **Separation of Concerns**
   - Business logic mixed into UI components
   - Database queries in controller/handler code
   - Configuration values hardcoded in business logic
   - Cross-cutting concerns (logging, auth, validation) inconsistently applied

3. **Scalability Issues**
   - In-memory state that would break with multiple instances
   - File system writes in request handlers (won't work in serverless)
   - Missing database connection pooling
   - Synchronous processing of tasks that should be async/queued
   - Missing pagination on list endpoints

4. **Technical Debt Indicators**
   - Multiple implementations of the same functionality
   - Inconsistent patterns across similar modules (some use pattern A, others use B)
   - Deprecated dependencies or APIs still in use
   - TODO/HACK/FIXME comments indicating known issues
   - Overly complex code that could be simplified

5. **Configuration & Environment**
   - Missing environment-based configuration
   - Secrets in configuration files tracked by git
   - Missing .env.example or documentation of required env vars
   - No distinction between dev/staging/production configs

6. **Project Organization**
   - Unclear file organization (where does new code go?)
   - Missing or misleading directory structure
   - Build configuration issues or unnecessary complexity
   - Missing linting/formatting configuration

### How to Explore

1. Map the high-level directory structure and understand the project layout
2. Trace key dependency chains between major modules
3. Identify the architectural pattern (MVC, layered, microservices, monolith, etc.)
4. Look for config/env handling patterns
5. Check for consistency across similar modules

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Connect findings to issues already identified in P1-P4. Architectural problems often explain patterns seen in earlier phases.` : ''}

${findingFormat('P5', 'System Architecture Review')}
`.trim();
}
