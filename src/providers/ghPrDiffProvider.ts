import { displayWarning } from '#src/consoleUtils.js';
import { execAsync } from '#src/utils.js';
import type { ProviderConfig } from './types.js';

/**
 * Gets PR diff using GitHub CLI
 * @param _ config (unused in this provider)
 * @param prId GitHub PR number
 * @returns GitHub PR diff content or null if not found
 */
export async function get(
  _: ProviderConfig | null,
  prId: string | undefined
): Promise<string | null> {
  if (!prId) {
    displayWarning('No GitHub PR number provided');
    return null;
  }

  try {
    // Use the GitHub CLI to fetch PR diff
    const prDiffContent = await execAsync(`gh pr diff ${prId}`);

    if (!prDiffContent) {
      displayWarning(`No diff content found for GitHub PR #${prId}`);
      return null;
    }

    return `GitHub PR Diff: #${prId}\n\n${prDiffContent}`;
  } catch (error) {
    displayWarning(`
Failed to get GitHub PR diff #${prId}: ${error instanceof Error ? error.message : String(error)}
Consider checking if gh cli (https://cli.github.com/) is installed and authenticated.
    `);
    return null;
  }
}
