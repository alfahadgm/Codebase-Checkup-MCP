import { describe, it, expect } from 'vitest';
import { fixWorkflowPrompt } from '../fix-workflow.js';

describe('fixWorkflowPrompt', () => {
  const sessionId = 'checkup-test123-1';

  it('returns a string containing the session ID', () => {
    const prompt = fixWorkflowPrompt(sessionId);
    expect(prompt).toContain(sessionId);
  });

  it('contains all workflow steps', () => {
    const prompt = fixWorkflowPrompt(sessionId);
    expect(prompt).toContain('Step 1: RECOVER');
    expect(prompt).toContain('Step 2: ASK');
    expect(prompt).toContain('Step 3: PLAN');
    expect(prompt).toContain('Step 4: FIX');
    expect(prompt).toContain('Step 5: VERIFY');
  });

  it('references the correct MCP tools', () => {
    const prompt = fixWorkflowPrompt(sessionId);
    expect(prompt).toContain('checkup_get_report');
    expect(prompt).toContain('checkup_get_fix_plan');
    expect(prompt).toContain('checkup_record_fix');
    expect(prompt).toContain('checkup_get_progress');
  });

  it('includes priority filter options', () => {
    const prompt = fixWorkflowPrompt(sessionId);
    expect(prompt).toContain('critical');
    expect(prompt).toContain('critical_and_high');
  });

  it('instructs to ask user before applying fixes', () => {
    const prompt = fixWorkflowPrompt(sessionId);
    expect(prompt).toContain('Wait for');
    expect(prompt).toContain('confirmation');
  });
});
