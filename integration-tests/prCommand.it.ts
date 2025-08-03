import { describe, expect, it } from 'vitest';
import { runCommandWithArgs } from './support/commandRunner.ts';
import { extractReviewScore } from './support/reviewScoreExtractor.ts';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PR Command Integration Tests', () => {
  // Test for PR review with approval
  it('should approve PR #25 with issue #67 and write to a specified file path', async () => {
    // Use real PR data instead of mock files
    const output = await runCommandWithArgs('npx', [
      'gth',
      '--write-output-to-file',
      'testreview.md',
      'pr',
      '130',
      '133',
    ]);

    // Assert that built-in file writing is enabled and advertised
    expect(output).toContain('This report can be found in');

    // Check for approval in the response (score >= 5)
    const score = extractReviewScore(output);
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(5);
    const testreview = fs.readFileSync(path.join(__dirname, 'testreview.md'), { encoding: 'utf8' });
    expect(testreview).toContain('Model:');
    expect(testreview).toContain('<REVIEW>');
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
