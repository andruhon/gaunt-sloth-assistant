import { describe, expect, it } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('Code Command Integration Tests', () => {
  // Test for the code command
  it('should respond correctly to basic programming question', () => {
    const output = runCommandInTestDir('npx gth code "which programming language JS stands for"');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, 'JavaScript')).toBe(true);
  });

  it('should use file read tool', () => {
    const output = runCommandInTestDir('npx gth code "read file test-data/filewithgoodcode.js"');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, 'prime')).toBe(true);
  });

  it('should have full file system access', () => {
    const output = runCommandInTestDir(
      'npx gth code "write a simple hello world to a file called hello.js"'
    );

    // Check for expected content in the response indicating file was written
    expect(checkOutputForExpectedContent(output, 'hello.js')).toBe(true);
  });
});
