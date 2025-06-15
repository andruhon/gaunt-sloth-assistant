import { describe, it, expect } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { extractReviewScore } from './support/reviewScoreExtractor';

describe('Review Command Integration Tests', () => {
  // Test for reviewing good code
  it('should provide positive review for good code', () => {
    const output = runCommandInTestDir('npx gth review test-data/filewithgoodcode.js');

    // Check for positive feedback in the review (score >= 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(5);
  });

  // Test for reviewing bad code
  it('should identify issues in bad code', () => {
    const output = runCommandInTestDir('npx gth review test-data/filewithbadcode.js');

    // Check for issue identification in the review (score < 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeLessThan(5);
  });
});
