import { GthConfig } from '#src/config.js';
import { displayError, displayInfo, displaySuccess, displayWarning } from '#src/consoleUtils.js';
import { wrapContent } from '#src/prompt.js';
import { getInstallDir, getProjectDir } from '#src/systemUtils.js';
import {
  appendFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  type WriteStream,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import url from 'node:url';

/**
 * File I/O utilities for the Gaunt Sloth Assistant.
 * This module consolidates all file-related operations including reading, writing,
 * and log stream management.
 */

// Internal state for log stream management
interface LogStreamState {
  logWriteStream?: WriteStream;
}

const logStreamState: LogStreamState = {
  logWriteStream: undefined,
};

/**
 * Reads a file from the current project directory
 * @param fileName - The name/path of the file relative to the project directory
 * @returns The contents of the file as a string
 */
export function readFileFromProjectDir(fileName: string): string {
  const currentDir = getProjectDir();
  const filePath = resolve(currentDir, fileName);
  displayInfo(`Reading file ${filePath}...`);
  return readFileSyncWithMessages(filePath);
}

/**
 * Reads a file from the installation directory
 * @param filePath - The path relative to the installation directory
 * @returns The contents of the file as a string
 * @throws Error if the file cannot be read
 */
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

/**
 * Writes a file only if it doesn't already exist, with informative messages
 * @param filePath - The absolute path where to write the file
 * @param content - The content to write to the file
 */
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

/**
 * Appends content to a file, creating parent directories if necessary
 * @param filePath - The absolute path of the file to append to
 * @param content - The content to append to the file
 */
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

/**
 * Reads a file synchronously with error handling and informative messages
 * @param filePath - The absolute path of the file to read
 * @param errorMessageIn - Custom error message prefix (optional)
 * @param noFileMessage - Custom message when file doesn't exist (optional)
 * @returns The contents of the file as a string
 * @throws Error if the file cannot be read
 */
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

/**
 * Reads multiple files from the current directory and returns their contents
 * Each file is wrapped in a content block with a unique identifier
 * @param fileNames - A single file name or array of file names to read
 * @returns Combined content of all files with proper formatting
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

/**
 * Dynamically imports a module from a file path outside of the installation directory
 * @param filePath - The absolute path to the file to import
 * @returns A promise that resolves to the imported module with a configure function
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
 * Initializes a log stream for writing log messages to a file
 * @param logFileName - The path to the log file
 */
export const initLogStream = (logFileName: string): void => {
  try {
    // Close existing stream if present
    if (logStreamState.logWriteStream) {
      logStreamState.logWriteStream.end();
    }

    // Create new write stream with append mode
    logStreamState.logWriteStream = createWriteStream(logFileName, {
      flags: 'a',
      autoClose: true,
    });

    // Handle stream errors
    logStreamState.logWriteStream.on('error', (err) => {
      displayWarning(`Log stream error: ${err.message}`);
      logStreamState.logWriteStream = undefined;
    });

    // Handle stream close
    logStreamState.logWriteStream.on('close', () => {
      logStreamState.logWriteStream = undefined;
    });
  } catch (err) {
    displayWarning(
      `Failed to create log stream: ${err instanceof Error ? err.message : String(err)}`
    );
    logStreamState.logWriteStream = undefined;
  }
};

/**
 * Writes a message to the current log stream if available
 * @param message - The message to write to the log stream
 */
export const writeToLogStream = (message: string): void => {
  if (logStreamState.logWriteStream && !logStreamState.logWriteStream.destroyed) {
    logStreamState.logWriteStream.write(message);
  }
};

/**
 * Closes the current log stream if open
 */
export const closeLogStream = (): void => {
  if (logStreamState.logWriteStream && !logStreamState.logWriteStream.destroyed) {
    logStreamState.logWriteStream.end();
    logStreamState.logWriteStream = undefined;
  }
};

// Ensure log stream is closed on process exit
process.on('exit', () => {
  closeLogStream();
});

process.on('SIGINT', () => {
  closeLogStream();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeLogStream();
  process.exit(0);
});
