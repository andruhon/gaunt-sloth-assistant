import { displayWarning } from '#src/consoleUtils.js';
import { execAsync } from '#src/utils.js';
import type { ProviderConfig } from './types.js';

/**
 * Gets GitHub issue using GitHub CLI
 * @param _ config (unused in this provider)
 * @param issueId GitHub issue number
 * @returns GitHub issue content or null if not found
 */
export async function get(
  _: ProviderConfig | null,
  issueId: string | undefined
): Promise<string | null> {
  if (!issueId) {
    displayWarning('No GitHub issue number provided');
    return null;
  }

  try {
    // Use the GitHub CLI to fetch issue details
    const issueContent = await execAsync(`gh issue view ${issueId}`);

    if (!issueContent) {
      displayWarning(`No content found for GitHub issue #${issueId}`);
      return null;
    }

    return `GitHub Issue: #${issueId}\n\n${issueContent}`;
  } catch (error) {
    displayWarning(`
Failed to get GitHub issue #${issueId}: ${error instanceof Error ? error.message : String(error)}
Consider checking if gh cli (https://cli.github.com/) is installed and authenticated.
    `);
    return null;
  }
}
