import { readFileFromCurrentOrInstallDir, spawnCommand } from '#src/utils.js';
import { displayError } from '#src/consoleUtils.js';
import { exit } from '#src/systemUtils.js';
import {
  GSLOTH_BACKSTORY,
  GSLOTH_CHAT_PROMPT,
  GSLOTH_CODE_PROMPT,
  GSLOTH_SYSTEM_PROMPT,
} from '#src/constants.js';
import { getGslothConfigReadPath } from '#src/filePathUtils.js';

export function readBackstory(): string {
  return readFileFromCurrentOrInstallDir(GSLOTH_BACKSTORY, true);
}

export function readGuidelines(guidelinesFilename: string): string {
  return readFileFromCurrentOrInstallDir(guidelinesFilename);
}

export function readReviewInstructions(reviewInstructions: string): string {
  return readConfigPromptFile(reviewInstructions);
}

export function readSystemPrompt(): string {
  return readFileFromCurrentOrInstallDir(GSLOTH_SYSTEM_PROMPT, true);
}

export function readChatPrompt(): string {
  return readFileFromCurrentOrInstallDir(GSLOTH_CHAT_PROMPT, true);
}

export function readCodePrompt(): string {
  return readFileFromCurrentOrInstallDir(GSLOTH_CODE_PROMPT, true);
}

function readConfigPromptFile(guidelinesFilename: string): string {
  try {
    const filePath = getGslothConfigReadPath(guidelinesFilename);
    return readFileFromCurrentOrInstallDir(filePath);
  } catch (error) {
    displayError(
      'Consider running `gsloth init` to set up your project. Check `gsloth init --help` to see options.'
    );
    throw error;
  }
}

/**
 * This function expects https://cli.github.com/ to be installed and authenticated.
 * It does something like `gh pr diff 42`
 */
export async function getPrDiff(pr: string): Promise<string> {
  // TODO makes sense to check if gh is available and authenticated
  try {
    return await spawnCommand('gh', ['pr', 'diff', pr], 'Loading PR diff...', 'Loaded PR diff.');
  } catch (e) {
    displayError(e instanceof Error ? e.toString() : String(e));
    displayError(`Failed to call "gh pr diff ${pr}", see message above for details.`);
    exit();
    return ''; // This line will never be reached due to exit()
  }
}
