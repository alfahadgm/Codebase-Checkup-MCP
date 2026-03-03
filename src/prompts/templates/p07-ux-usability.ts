import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p07UxUsabilityPrompt(args: PhasePromptArgs): string {
  return `
# P7: UX & Usability

${globalRules(7)}

## Your Task

Identify user-facing issues that degrade the experience: missing loading states, poor error messages, accessibility gaps, broken flows, and client-side vulnerabilities.

### What to Look For

1. **Loading & Feedback States**
   - Async operations without loading indicators (buttons that don't show pending state)
   - Missing skeleton screens or placeholders during data fetching
   - Forms that don't disable submit button during processing
   - No visual feedback after successful actions (save, delete, update)
   - Missing progress indicators for long-running operations

2. **Error UX**
   - Generic "Something went wrong" messages with no guidance
   - Form validation errors that don't indicate which field is wrong
   - Network errors shown as raw technical messages
   - No retry option after transient failures
   - 404 pages that don't help users navigate back

3. **Accessibility (a11y)**
   - Images without alt text
   - Form inputs without labels or aria-labels
   - Missing keyboard navigation support
   - Insufficient color contrast
   - Missing focus management after modals/dialogs
   - Missing ARIA roles on interactive elements
   - Screen reader incompatible dynamic content updates

4. **Broken or Incomplete Flows**
   - Multi-step flows without back navigation
   - Unsaved changes not warned about on navigation
   - Deep links that break when accessed directly
   - Missing empty states ("No items" vs blank screen)
   - Pagination that loses scroll position or filters

5. **Client-Side Security**
   - XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML with user data)
   - Sensitive data stored in localStorage/sessionStorage
   - Missing Content Security Policy headers
   - Clickjacking vulnerability (missing X-Frame-Options)
   - Insecure form actions (HTTP instead of HTTPS)

6. **Responsive & Cross-Browser**
   - Layouts that break on mobile viewports
   - Touch targets too small for mobile (< 44x44px)
   - Missing media queries for key breakpoints
   - Hardcoded widths that cause horizontal scroll

### How to Explore

1. Find UI component files (React components, Vue components, templates)
2. Search for form handling code and check validation patterns
3. Look for async operation triggers and check for loading state management
4. Search for innerHTML/dangerouslySetInnerHTML usage
5. Check for aria-* attributes and accessibility patterns

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude dead code from P1. Connect to error handling gaps from P6.` : ''}

${findingFormat('P7', 'UX & Usability')}

**Note:** If this is a backend-only project with no UI, state that clearly and focus on API usability (documentation, error messages, consistent response formats) instead.
`.trim();
}
