import { displayError } from '#src/consoleUtils.js';
import {
  GSLOTH_BACKSTORY,
  GSLOTH_CHAT_PROMPT,
  GSLOTH_CODE_PROMPT,
  GSLOTH_SYSTEM_PROMPT,
} from '#src/constants.js';
import { exit } from '#src/systemUtils.js';
import { readFileFromInstallDir, spawnCommand } from '#src/utils.js';
import { existsSync, readFileSync } from 'node:fs';

import { randomUUID } from 'node:crypto';
import { getGslothConfigReadPath } from './filePathUtils.js';

export function readBackstory(): string {
  return readPromptFile(GSLOTH_BACKSTORY);
}

export function readGuidelines(guidelinesFilename: string): string {
  return readPromptFile(guidelinesFilename);
}

export function readReviewInstructions(reviewInstructions: string): string {
  return readPromptFile(reviewInstructions);
}

export function readSystemPrompt(): string {
  return readPromptFile(GSLOTH_SYSTEM_PROMPT);
}

export function readChatPrompt(): string {
  return readPromptFile(GSLOTH_CHAT_PROMPT);
}

export function readCodePrompt(): string {
  return readPromptFile(GSLOTH_CODE_PROMPT);
}

function readPromptFile(filename: string): string {
  const path = getGslothConfigReadPath(filename);
  if (existsSync(path)) {
    return readFileSync(path, { encoding: 'utf8' });
  }
  return readFileFromInstallDir(filename);
}

/**
 * Wraps content within randomized block
 */
export function wrapContent(
  content: string,
  wrapBlockPrefix: string = 'block',
  prefix: string = 'content',
  alwaysWrap: boolean = false
): string {
  if (content || alwaysWrap) {
    const contentWrapper = [];
    const block = wrapBlockPrefix + '-' + randomUUID().substring(0, 7);
    contentWrapper.push(`\nProvided ${prefix} follows within ${block} block\n`);
    contentWrapper.push(`<${block}>\n`);
    contentWrapper.push(content);
    contentWrapper.push(`\n</${block}>\n`);
    return contentWrapper.join('');
  }
  return content;
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
