import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p04ApiIntegrationPrompt(args: PhasePromptArgs): string {
  return `
# P4: API Integration & Contracts

${globalRules(4)}

## Your Task

Validate API contracts, identify request/response mismatches, missing error handling on API calls, authentication issues, and endpoint security vulnerabilities.

### What to Look For

1. **Contract Mismatches**
   - Frontend types/interfaces that don't match backend response shapes
   - API calls sending fields the server doesn't expect (or missing required fields)
   - Hardcoded URLs or API versions that may be outdated
   - Missing Content-Type headers or incorrect serialization

2. **Authentication & Authorization**
   - API routes missing authentication middleware
   - Inconsistent auth token handling (some routes check, others don't)
   - Missing CSRF protection on state-changing endpoints
   - API keys or secrets hardcoded in source code
   - Missing rate limiting on sensitive endpoints (login, password reset)

3. **Error Handling on API Calls**
   - API calls without try/catch or .catch() handlers
   - Missing timeout configuration on HTTP requests
   - No retry logic for transient failures (network errors, 503s)
   - Incorrect error status code usage (200 for errors, 500 for validation)
   - Missing error response parsing (assuming success shape on error)

4. **Data Serialization**
   - Date objects not properly serialized/deserialized across API boundary
   - BigInt/Decimal precision lost during JSON serialization
   - File uploads not properly encoded (missing multipart handling)
   - Missing response validation (trusting API responses blindly)

5. **API Security**
   - Endpoints exposing sensitive data without proper field filtering
   - Missing CORS configuration or overly permissive CORS
   - GraphQL queries without depth/complexity limits
   - Missing request body size limits
   - Verbose error messages leaking implementation details in production

6. **Third-Party Integrations**
   - External API calls without proper error handling
   - Missing webhook signature verification
   - No fallback when external services are unavailable
   - API version pinning issues

### How to Explore

1. Find API route definitions (Express routes, Next.js API routes, FastAPI endpoints, etc.)
2. Find API client code (fetch, axios, tRPC calls, GraphQL queries)
3. Compare frontend type definitions with backend schemas
4. Check middleware chains for auth/validation gaps
5. Search for hardcoded API URLs, keys, or tokens

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude dead code from P1. Cross-reference with validation gaps from P3.` : ''}

${findingFormat('P4', 'API Integration & Contracts')}
`.trim();
}
