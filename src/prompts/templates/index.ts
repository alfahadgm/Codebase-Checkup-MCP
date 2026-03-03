export { PhasePromptArgs } from './p01-dead-code.js';
export { p01DeadCodePrompt } from './p01-dead-code.js';
export { p02TestingPrompt } from './p02-testing.js';
export { p03LogicGapsPrompt } from './p03-logic-gaps.js';
export { p04ApiIntegrationPrompt } from './p04-api-integration.js';
export { p05ArchitecturePrompt } from './p05-architecture.js';
export { p06ErrorHandlingPrompt } from './p06-error-handling.js';
export { p07UxUsabilityPrompt } from './p07-ux-usability.js';
export { p08MissingUxPrompt } from './p08-missing-ux.js';
export { p09PerformancePrompt } from './p09-performance.js';
export { p10SynthesisPrompt } from './p10-synthesis.js';
export { globalRules } from './global-rules.js';
export { findingFormat } from './finding-format.js';
export { fixWorkflowPrompt } from './fix-workflow.js';

import { PhasePromptArgs } from './p01-dead-code.js';
import { p01DeadCodePrompt } from './p01-dead-code.js';
import { p02TestingPrompt } from './p02-testing.js';
import { p03LogicGapsPrompt } from './p03-logic-gaps.js';
import { p04ApiIntegrationPrompt } from './p04-api-integration.js';
import { p05ArchitecturePrompt } from './p05-architecture.js';
import { p06ErrorHandlingPrompt } from './p06-error-handling.js';
import { p07UxUsabilityPrompt } from './p07-ux-usability.js';
import { p08MissingUxPrompt } from './p08-missing-ux.js';
import { p09PerformancePrompt } from './p09-performance.js';
import { p10SynthesisPrompt } from './p10-synthesis.js';

type PromptFn = (args: PhasePromptArgs) => string;

/** Map from phase ID (e.g., "P1") to its prompt generator function. */
export const PHASE_PROMPTS: Record<string, PromptFn> = {
  P1: p01DeadCodePrompt,
  P2: p02TestingPrompt,
  P3: p03LogicGapsPrompt,
  P4: p04ApiIntegrationPrompt,
  P5: p05ArchitecturePrompt,
  P6: p06ErrorHandlingPrompt,
  P7: p07UxUsabilityPrompt,
  P8: p08MissingUxPrompt,
  P9: p09PerformancePrompt,
  P10: p10SynthesisPrompt,
};
