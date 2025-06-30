import { describe, it, expect } from 'vitest';
import { runCommandWithArgs } from './support/commandRunner';
import { extractReviewScore } from './support/reviewScoreExtractor';

describe('PR Command Integration Tests', () => {
  // Test for PR review with approval
  it('should approve PR #25 with issue #67', async () => {
    // Use real PR data instead of mock files
    const output = await runCommandWithArgs('npx', ['gth', 'pr', '25', '67']);

    // Check for approval in the response (score >= 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(5);
  });

  // Test for PR review with rejection
  it('should reject PR #1', async () => {
    // Use real PR data instead of mock files
    const output = await runCommandWithArgs('npx', ['gth', 'pr', '1']);

    // Check for rejection in the response (score < 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeLessThan(5);
  });
});
