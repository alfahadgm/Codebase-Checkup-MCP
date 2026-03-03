import { globalRules } from './global-rules.js';
import { findingFormat } from './finding-format.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p09PerformancePrompt(args: PhasePromptArgs): string {
  return `
# P9: Performance Bottlenecks

${globalRules(9)}

## Your Task

Detect performance bottlenecks: N+1 queries, missing indexes, unbounded loops, memory leaks, large bundle sizes, unnecessary re-renders, and resource optimization opportunities.

### What to Look For

1. **Database & Query Performance**
   - N+1 query patterns (loading related data in a loop instead of a join/include)
   - Missing database indexes on frequently queried columns
   - SELECT * queries instead of selecting only needed columns
   - Missing pagination on queries that could return unbounded results
   - Unoptimized aggregation queries (counting in application code vs. COUNT)
   - Missing query result caching for expensive read-heavy operations

2. **Memory Issues**
   - Loading entire datasets into memory instead of streaming/pagination
   - Event listeners never removed (memory leaks in long-running processes)
   - Growing arrays/objects without bounds (caches without eviction)
   - Large objects kept in closure scope unnecessarily
   - Circular references preventing garbage collection

3. **Computation Bottlenecks**
   - Synchronous heavy computation blocking the event loop (Node.js)
   - Missing memoization for expensive pure functions
   - Redundant calculations in hot loops
   - String concatenation in loops (should use array join or template)
   - Unnecessary deep cloning of large objects

4. **Network & I/O**
   - Sequential API calls that could be parallelized (Promise.all)
   - Missing HTTP caching headers on static or rarely-changing responses
   - Large payloads without compression (missing gzip/brotli)
   - Images not optimized (missing responsive images, no lazy loading)
   - Missing CDN for static assets

5. **Frontend Performance** (if applicable)
   - Unnecessary component re-renders (missing memo, useMemo, useCallback)
   - Large JavaScript bundles without code splitting
   - Synchronous imports that should be lazy loaded
   - Layout thrashing (reading DOM then writing DOM in loops)
   - Missing virtual scrolling for long lists
   - Unoptimized animations (using top/left instead of transform)

6. **Startup & Build**
   - Slow application startup due to eager initialization
   - Missing tree-shaking (importing entire libraries for one function)
   - Build configuration issues causing unnecessarily large output
   - Missing production optimizations in build config

### How to Explore

1. Look for database query patterns (ORM calls, raw SQL, query builders)
2. Search for loops that contain I/O or async operations inside them
3. Check bundle configuration and entry points
4. Look for caching patterns (or lack thereof)
5. Review React/Vue component render logic for optimization opportunities

${args.priorFindings ? `## Prior Findings for Cross-Reference\n${args.priorFindings}\n\n**Note:** Exclude dead code from P1. Cross-reference with architecture issues from P5.` : ''}

${findingFormat('P9', 'Performance Bottlenecks')}
`.trim();
}
