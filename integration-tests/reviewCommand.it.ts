import { describe, it, expect } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('Review Command Integration Tests', () => {
  // Test for reviewing good code
  it('should provide positive review for good code', () => {
    const output = runCommandInTestDir('npx gth review test-data/filewithgoodcode.js');

    // Check for positive feedback in the review
    expect(checkOutputForExpectedContent(output, '<REVIEW>APPROVE</REVIEW>')).toBe(true);
  });

  // Test for reviewing bad code
  it('should identify issues in bad code', () => {
    const output = runCommandInTestDir('npx gth review test-data/filewithbadcode.js');

    // Check for issue identification in the review
    expect(checkOutputForExpectedContent(output, '<REVIEW>REQUEST_CHANGES</REVIEW>')).toBe(true);
  });
});