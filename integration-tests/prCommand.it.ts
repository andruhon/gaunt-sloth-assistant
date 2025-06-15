import { describe, it, expect } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { extractReviewScore } from './support/reviewScoreExtractor';

describe('PR Command Integration Tests', () => {
  // Test for PR review with approval
  it('should approve PR #39 with issue #23', () => {
    // Use real PR data instead of mock files
    const output = runCommandInTestDir('npx gth pr 39 23');

    // Check for approval in the response (score >= 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(5);
  });

  // Test for PR review with rejection
  it('should reject PR #1', () => {
    // Use real PR data instead of mock files
    const output = runCommandInTestDir('npx gth pr 1');

    // Check for rejection in the response (score < 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeLessThan(5);
  });
});
