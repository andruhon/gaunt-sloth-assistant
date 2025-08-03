import { describe, it, expect } from 'vitest';
import { runCommandWithArgs } from './support/commandRunner.ts';
import { extractReviewScore } from './support/reviewScoreExtractor.ts';

describe('Review Command Integration Tests', () => {
  // Test for reviewing good code
  it('should provide positive review for good code', async () => {
    const output = await runCommandWithArgs('npx', [
      'gth',
      '-wn',
      'review',
      'test-data/filewithgoodcode.js',
    ]);

    expect(output, '-wn should disable session logging').not.toContain(
      'This report can be found in'
    );
    // Check for positive feedback in the review (score >= 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(5);
  });

  // Test for reviewing bad code
  it('should identify issues in bad code', async () => {
    const output = await runCommandWithArgs('npx', [
      'gth',
      'review',
      'test-data/filewithbadcode.js',
    ]);

    expect(output).toContain('This report can be found in');
    // Check for issue identification in the review (score < 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).lessThanOrEqual(5);
  });
});
