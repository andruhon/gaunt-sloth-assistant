import { display, displayError, displaySuccess, displayWarning } from '#src/consoleUtils.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { SlothConfig } from '#src/config.js';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { getCurrentDir, getInstallDir, stdout } from '#src/systemUtils.js';
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

export function readFileFromCurrentDir(fileName: string): string {
  const currentDir = getCurrentDir();
  const filePath = resolve(currentDir, fileName);
  display(`Reading file ${filePath}...`);
  return readFileSyncWithMessages(filePath);
}

export function readFileFromCurrentOrInstallDir(filePath: string, silentCurrent?: boolean): string {
  const currentDir = getCurrentDir();
  const currentFilePath = resolve(currentDir, filePath);
  if (!silentCurrent) {
    display(`Reading file ${currentFilePath}...`);
  }

  try {
    return readFileSync(currentFilePath, { encoding: 'utf8' });
  } catch (_error) {
    if (!silentCurrent) {
      display(`The ${currentFilePath} not found or can\'t be read, trying install directory...`);
    }
    const installDir = getInstallDir();
    const installFilePath = resolve(installDir, filePath);
    try {
      return readFileSync(installFilePath, { encoding: 'utf8' });
    } catch (readFromInstallDirError) {
      displayError(`The ${installFilePath} not found or can\'t be read.`);
      throw readFromInstallDirError;
    }
  }
}

export function writeFileIfNotExistsWithMessages(filePath: string, content: string): void {
  display(`checking ${filePath} existence`);
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
        display(successMessage);
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
): Promise<{ configure: () => Promise<Partial<SlothConfig>> }> {
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
 * @returns Combined content of all files with proper formatting
 */
export function readMultipleFilesFromCurrentDir(fileNames: string | string[]): string {
  if (!Array.isArray(fileNames)) {
    return readFileFromCurrentDir(fileNames);
  }

  return fileNames
    .map((fileName) => {
      const content = readFileFromCurrentDir(fileName);
      return `${fileName}:\n\`\`\`\n${content}\n\`\`\``;
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
