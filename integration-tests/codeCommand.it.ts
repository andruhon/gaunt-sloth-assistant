import { describe, expect, it } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('Code Command Integration Tests', () => {
  it('should respond to initial message', () => {
    const output = runCommandInTestDir('npx gth code "Hello, can you help me with some code?"');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, ['help', 'assist', 'code'])).toBe(true);
  });

  it('should start interactive session without initial message', () => {
    const output = runCommandInTestDir('npx gth code');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, 'ready to code')).toBe(true);
    expect(checkOutputForExpectedContent(output, 'Type')).toBe(true);
  });

  it('should create code history file', () => {
    const output = runCommandInTestDir('npx gth code "Test message"');

    // Check that the response mentions the file path
    expect(checkOutputForExpectedContent(output, 'gth_')).toBe(true);
    expect(checkOutputForExpectedContent(output, '_CODE.md')).toBe(true);
  });
});
