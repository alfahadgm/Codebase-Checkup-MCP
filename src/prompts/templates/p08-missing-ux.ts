import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p08MissingUxPrompt(args: PhasePromptArgs): string {
  return `
# P8: Missing UX Capabilities

${globalRules(8)}

## Your Task

Find gaps between backend capabilities and frontend exposure. Identify features that exist server-side but lack a UI, APIs that exist but aren't called from the frontend, and frontend features that call nonexistent or incorrect endpoints.

### What to Look For

1. **Backend Without Frontend**
   - API endpoints that are defined but never called from any UI code
   - Database models/tables with CRUD operations that lack corresponding UI
   - Admin or management features that only work via direct API calls
   - Notification systems, export features, or batch operations without UI triggers
   - User settings or preferences stored in the backend but not exposed in UI

2. **Frontend Calling Nonexistent Backend**
   - UI buttons/forms that make API calls to endpoints that don't exist
   - Frontend code referencing API paths that were renamed or removed
   - Type definitions for API responses that don't match any real endpoint
   - Feature flags in the UI that toggle features with no backend support

3. **Incomplete Feature Implementation**
   - CRUD operations where only Create and Read are implemented (no Update/Delete UI)
   - Search/filter UI that doesn't actually filter results server-side
   - Sorting controls that only sort the current page (not the full dataset)
   - Export buttons that don't handle large datasets or provide progress
   - Upload features without proper validation, progress, or cancel support

4. **Missing Standard Features**
   - No user profile/settings page despite having user model
   - No password reset flow despite having auth system
   - No notification preferences despite having notification system
   - No data export despite storing user data (GDPR compliance)
   - No audit log or activity history for important actions

5. **Navigation & Discoverability**
   - Features that exist but aren't reachable from any navigation menu
   - Dead links in navigation pointing to unbuilt pages
   - Features only accessible via direct URL (not linked anywhere)

### How to Explore

1. List all API endpoints/routes in the backend
2. For each endpoint, search the frontend codebase for calls to that endpoint
3. List all frontend API calls and verify the backend endpoints exist
4. Compare database models with UI pages — does every entity have a management UI?
5. Check navigation menus against available routes/pages

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude dead code from P1. Cross-reference with API findings from P4 and UX findings from P7.` : ''}

${findingFormat('P8', 'Missing UX Capabilities')}

**Note:** If this is a backend-only project (library, API, CLI), analyze whether the API surface matches documented capabilities and whether all documented features are actually implemented.
`.trim();
}
