import { describe, expect, it } from 'vitest';
import { runCommandWithArgs } from './support/commandRunner.ts';
import { extractReviewScore } from './support/reviewScoreExtractor.ts';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PR Command Integration Tests', () => {
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
