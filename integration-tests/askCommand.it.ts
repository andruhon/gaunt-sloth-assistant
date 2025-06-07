import { describe, expect, it } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('Ask Command Integration Tests', () => {
  // Test for the ask command
  it('should respond correctly to basic programming question', () => {
    const output = runCommandInTestDir('npx gth ask "which programming language JS stands for"');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, 'JavaScript')).toBe(true);
  });

  it('should use file read tool', () => {
    const output = runCommandInTestDir('npx gth ask "read file test-data/filewithgoodcode.js"');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, 'prime')).toBe(true);
  });
});
