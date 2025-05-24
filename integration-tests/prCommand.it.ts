import { describe, it, expect } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('PR Command Integration Tests', () => {
  // Test for PR review with approval
  it('should approve PR #39 with issue #23', () => {
    // Use real PR data instead of mock files
    const output = runCommandInTestDir('npx gth pr 39 23');

    // Check for approval in the response
    expect(checkOutputForExpectedContent(output, '<REVIEW>APPROVE</REVIEW>')).toBe(true);
    expect(checkOutputForExpectedContent(output, '<REVIEW>REQUEST_CHANGES</REVIEW>')).toBe(false);
  });

  // Test for PR review with rejection
  it('should reject PR #1', () => {
    // Use real PR data instead of mock files
    const output = runCommandInTestDir('npx gth pr 1');

    // Check for rejection in the response
    expect(checkOutputForExpectedContent(output, '<REVIEW>REQUEST_CHANGES</REVIEW>')).toBe(true);
  });
});
