import { GthConfig } from '#src/config.js';
import { displayError, displayInfo, displaySuccess, displayWarning } from '#src/consoleUtils.js';
import { debugLog } from '#src/debugUtils.js';
import { wrapContent } from '#src/prompt.js';
import { getInstallDir, getProjectDir, stdout } from '#src/systemUtils.js';
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import url from 'node:url';

export function toFileSafeString(string: string): string {
  return string.replace(/[^A-Za-z0-9]/g, '-');
}

/**
 * Returns a formatted date string in the format YYYY-MM-DD_HH-MM-SS using local time
 * @returns A formatted date string
 */
export function fileSafeLocalDate(): string {
  const date = new Date();

  // Format: YYYY-MM-DD_HH-MM-SS using local time directly
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Generates a standardized filename with the format: gth_YYYY-MM-DD_HH-MM-SS_COMMAND.md
 * @param command - The command that created the file (ASK, REVIEW, PR, etc.)
 * @returns A standardized filename string
 */
export function generateStandardFileName(command: string): string {
  const dateTimeStr = fileSafeLocalDate();
  const commandStr = toFileSafeString(command.toUpperCase());

  return `gth_${dateTimeStr}_${commandStr}.md`;
}

export function readFileFromProjectDir(fileName: string): string {
  const currentDir = getProjectDir();
  const filePath = resolve(currentDir, fileName);
  displayInfo(`Reading file ${filePath}...`);
  return readFileSyncWithMessages(filePath);
}

export function readFileFromInstallDir(filePath: string): string {
  const installDir = getInstallDir();
  const installFilePath = resolve(installDir, filePath);
  try {
    return readFileSync(installFilePath, { encoding: 'utf8' });
  } catch (readFromInstallDirError) {
    displayError(`The ${installFilePath} not found or can\'t be read.`);
    throw readFromInstallDirError;
  }
}

export function writeFileIfNotExistsWithMessages(filePath: string, content: string): void {
  displayInfo(`checking ${filePath} existence`);
  if (!existsSync(filePath)) {
    // Create parent directories if they don't exist
    const parentDir = dirname(filePath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    writeFileSync(filePath, content);
    displaySuccess(`Created ${filePath}`);
  } else {
    displayWarning(`${filePath} already exists`);
  }
}

export function appendToFile(filePath: string, content: string): void {
  try {
    const parentDir = dirname(filePath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    appendFileSync(filePath, content);
  } catch (e) {
    displayError(`Failed to append to file ${filePath}: ${(e as Error).message}`);
  }
}

export function readFileSyncWithMessages(
  filePath: string,
  errorMessageIn?: string,
  noFileMessage?: string
): string {
  const errorMessage = errorMessageIn ?? 'Error reading file at: ';
  try {
    return readFileSync(filePath, { encoding: 'utf8' });
  } catch (error) {
    displayError(errorMessage + filePath);
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      displayWarning(noFileMessage ?? 'Please ensure the file exists.');
    } else {
      displayError((error as Error).message);
    }
    throw error;
  }
}

interface SpawnOutput {
  stdout: string;
  stderr: string;
}

export async function spawnCommand(
  command: string,
  args: string[],
  progressMessage: string,
  successMessage: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const progressIndicator = new ProgressIndicator(progressMessage, true);
    const out: SpawnOutput = { stdout: '', stderr: '' };
    const spawned = spawn(command, args);

    spawned.stdout.on('data', async (stdoutChunk) => {
      progressIndicator.indicate();
      out.stdout += stdoutChunk.toString();
    });

    spawned.stderr.on('data', (err) => {
      progressIndicator.indicate();
      out.stderr += err.toString();
    });

    spawned.on('error', (err) => {
      reject(err.toString());
    });

    spawned.on('close', (code) => {
      if (code === 0) {
        displaySuccess(successMessage);
        resolve(out.stdout);
      } else {
        displayError(`Failed to spawn command with code ${code}`);
        reject(out.stdout + ' ' + out.stderr);
      }
    });
  });
}

export function getSlothVersion(): string {
  // TODO figure out if this can be injected with TS
  const installDir = getInstallDir();
  const jsonPath = resolve(installDir, 'package.json');
  const projectJson = readFileSync(jsonPath, { encoding: 'utf8' });
  return JSON.parse(projectJson).version;
}

export class ProgressIndicator {
  private interval: number | undefined = undefined;

  constructor(initialMessage: string, manual?: boolean) {
    stdout.write(initialMessage);
    if (!manual) {
      this.interval = setInterval(this.indicateInner, 1000) as unknown as number;
    }
  }

  private indicateInner(): void {
    stdout.write('.');
  }

  indicate(): void {
    if (this.interval) {
      throw new Error('ProgressIndicator.indicate only to be called in manual mode');
    }
    this.indicateInner();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    stdout.write('\n');
  }
}

// Tool formatting utilities

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format tool call arguments in a human-readable way
 */
export function formatToolCallArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => {
      let displayValue: string;
      if (typeof value === 'string') {
        displayValue = value;
      } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = String(value);
      }
      return `${key}: ${truncateString(displayValue, 50)}`;
    })
    .join(', ');
}

/**
 * Format a single tool call with name and arguments
 */
export function formatToolCall(
  toolName: string,
  args: Record<string, unknown>,
  prefix = ''
): string {
  const formattedArgs = formatToolCallArgs(args);
  return `${prefix}${toolName}(${formattedArgs})`;
}

/**
 * Format multiple tool calls for display (matches Invocation.ts behavior)
 */
export function formatToolCalls(
  toolCalls: Array<{ name: string; args?: Record<string, unknown> }>,
  maxLength = 255
): string {
  const formatted = toolCalls
    .map((toolCall) => {
      debugLog(JSON.stringify(toolCall));
      const formattedArgs = formatToolCallArgs(toolCall.args || {});
      return `${toolCall.name}(${formattedArgs})`;
    })
    .join(', ');

  // Truncate to maxLength characters if needed
  return formatted.length > maxLength ? formatted.slice(0, maxLength - 3) + '...' : formatted;
}

interface LLMOutput {
  messages: Array<{
    content: string;
  }>;
}

/**
 * Extracts the content of the last message from an LLM response
 * @param output - The output from the LLM containing messages
 * @returns The content of the last message
 */
export function extractLastMessageContent(output: LLMOutput): string {
  if (!output || !output.messages || !output.messages.length) {
    return '';
  }
  return output.messages[output.messages.length - 1].content;
}

/**
 * Dynamically imports a module from a file path from the outside of the installation dir
 * @returns A promise that resolves to the imported module
 */
export function importExternalFile(
  filePath: string
): Promise<{ configure: () => Promise<Partial<GthConfig>> }> {
  const configFileUrl = url.pathToFileURL(filePath).toString();
  return import(configFileUrl);
}

/**
 * Alias for importExternalFile for backward compatibility with tests
 * @param filePath - The path to the file to import
 * @returns A promise that resolves to the imported module
 */
export const importFromFilePath = importExternalFile;

/**
 * Reads multiple files from the current directory and returns their contents
 * @param fileNames - Array of file names to read
 * @returns Combined content of all files with proper formatting, each file is wrapped in random block like <file-abvesde>
 */
export function readMultipleFilesFromProjectDir(fileNames: string | string[]): string {
  if (!Array.isArray(fileNames)) {
    return wrapContent(readFileFromProjectDir(fileNames), 'file', `file ${fileNames}`, true);
  }

  return fileNames
    .map((fileName) => {
      const content = readFileFromProjectDir(fileName);
      return `${wrapContent(content, 'file', `file ${fileName}`, true)}`;
    })
    .join('\n\n');
}

export async function execAsync(command: string): Promise<string> {
  const { exec } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(new Error(stderr));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Utility function to execute hook(s) - either a single hook or an array of hooks
 * Fully type-safe and works with any number of arguments
 * @param hooks - Single hook function or array of hook functions (or undefined)
 * @param args - Arguments to pass to each hook function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeHooks<T extends (...args: any[]) => Promise<void>>(
  hooks: T | T[] | undefined,
  ...args: Parameters<T>
): Promise<void> {
  if (!hooks) return;

  if (Array.isArray(hooks)) {
    for (const hook of hooks) {
      await hook(...args);
    }
  } else {
    await hooks(...args);
  }
}
