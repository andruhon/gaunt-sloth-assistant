import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'url';
import { getProjectDir as getProjectDirFromSystemUtils } from '#src/systemUtils.js';
import { GSLOTH_DIR, GSLOTH_SETTINGS_DIR, GSLOTH_AUTH } from '#src/constants.js';
import type { GthConfig } from '#src/config.js';

/**
 * Checks if .gsloth directory exists in the project root
 * @returns Boolean indicating whether .gsloth directory exists
 */
export function gslothDirExists(): boolean {
  const currentDir = getProjectDirFromSystemUtils();
  const gslothDirPath = resolve(currentDir, GSLOTH_DIR);
  return existsSync(gslothDirPath);
}

/**
 * Gets the path where gsloth should write files based on .gsloth directory existence
 * @param filename The filename to append to the path
 * @returns The resolved path where the file should be written
 */
export function getGslothFilePath(filename: string): string {
  const currentDir = getProjectDirFromSystemUtils();

  if (gslothDirExists()) {
    const gslothDirPath = resolve(currentDir, GSLOTH_DIR);
    return resolve(gslothDirPath, filename);
  }

  return resolve(currentDir, filename);
}

/**
 * Gets the path where gsloth should write configuration files based on .gsloth directory existence.
 * The main difference from {@link #getGslothConfigReadPath} is that this getGslothConfigWritePath
 * method creates internal settings directory if it does not exist.
 *
 * If .gsloth dir exists returns `projectdir/.gsloth/.gsloth-settings`
 * If .gsloth dir does not exist returns `projectdir`
 *
 * @param filename The configuration filename
 * @returns The resolved path where the configuration file should be written
 */
export function getGslothConfigWritePath(filename: string): string {
  const currentDir = getProjectDirFromSystemUtils();

  if (gslothDirExists()) {
    const gslothDirPath = resolve(currentDir, GSLOTH_DIR);
    const gslothSettingsPath = resolve(gslothDirPath, GSLOTH_SETTINGS_DIR);

    // Create .gsloth-settings directory if it doesn't exist
    if (!existsSync(gslothSettingsPath)) {
      mkdirSync(gslothSettingsPath, { recursive: true });
    }

    return resolve(gslothSettingsPath, filename);
  }

  return resolve(currentDir, filename);
}

/**
 * Gets the path where gsloth should look for configuration files based on .gsloth directory existence
 * @param filename The configuration filename to look for
 * @returns The resolved path where the configuration file should be found
 */
export function getGslothConfigReadPath(filename: string): string {
  const projectDir = getProjectDirFromSystemUtils();
  if (gslothDirExists()) {
    const gslothDirPath = resolve(projectDir, GSLOTH_DIR);
    const gslothSettingsPath = resolve(gslothDirPath, GSLOTH_SETTINGS_DIR);
    const configPath = resolve(gslothSettingsPath, filename);

    if (existsSync(configPath)) {
      return configPath;
    }
  }

  return resolve(projectDir, filename);
}

/**
 * Resolve an explicit output path string to an absolute file path.
 * Concerned only with string values:
 * - If the string includes a path separator, resolve relative to project root and ensure parent directories exist.
 * - If it's a bare filename, place it under .gsloth/ when present, otherwise project root.
 */
export function resolveOutputPath(writeOutputToFile: string): string {
  const currentDir = getProjectDirFromSystemUtils();
  const provided = String(writeOutputToFile).trim();

  // Detect if provided path contains path separators (cross-platform)
  const hasSeparator = provided.includes('/') || provided.includes('\\');

  // If no separators, treat as bare filename: prefer .gsloth/ when present
  if (!hasSeparator) {
    return getGslothFilePath(provided);
  }

  // If path contains directories, respect as-is and ensure parent dirs
  const absolutePath = resolve(currentDir, provided);
  const parentDir = dirname(absolutePath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }
  return absolutePath;
}

/**
 * Returns the output file path for a given command execution based on configuration.
 * - If writeOutputToFile is false, returns null.
 * - If writeOutputToFile is a string, resolves it without generating a default filename.
 * - If writeOutputToFile is true, generates a standard filename from source and resolves it under .gsloth/ (when present) or project root.
 */
export function getCommandOutputFilePath(config: GthConfig, source: string): string | null {
  const setting = config.writeOutputToFile;

  if (setting === false) {
    return null;
  }

  if (typeof setting === 'string') {
    const trimmed = setting.trim();
    if (trimmed.length === 0) return null;
    return resolveOutputPath(trimmed);
  }

  // setting === true -> generate filename and place it using getGslothFilePath
  const filename = generateStandardFileName(source.toUpperCase());
  return getGslothFilePath(filename);
}

// =============================================================================
// CONSOLIDATED PATH UTILITIES (Release 2)
// Functions consolidated from globalConfigUtils.ts, systemUtils.ts, and utils.ts
// =============================================================================

/**
 * Internal state for system utilities
 */
interface InternalPathState {
  installDir: string | null | undefined;
}

const internalPathState: InternalPathState = {
  installDir: undefined,
};

// -----------------------------------------------------------------------------
// Functions from globalConfigUtils.ts
// -----------------------------------------------------------------------------

/**
 * Gets the global .gsloth directory path in the user's home directory
 * @returns The resolved path to the global .gsloth directory
 */
export function getGlobalGslothDir(): string {
  return resolve(homedir(), GSLOTH_DIR);
}

/**
 * Ensures the global .gsloth directory exists in the user's home directory
 * Creates it if it doesn't exist
 * @returns The resolved path to the global .gsloth directory
 */
export function ensureGlobalGslothDir(): string {
  const globalDir = getGlobalGslothDir();

  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true });
  }

  return globalDir;
}

/**
 * Gets the global auth directory path
 * @returns The resolved path to the global auth directory
 */
export function getGlobalAuthDir(): string {
  const globalDir = getGlobalGslothDir();
  return resolve(globalDir, GSLOTH_AUTH);
}

/**
 * Ensures the global auth directory exists
 * Creates it if it doesn't exist
 * @returns The resolved path to the global auth directory
 */
export function ensureGlobalAuthDir(): string {
  // First ensure parent directory exists
  ensureGlobalGslothDir();

  const authDir = getGlobalAuthDir();

  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  return authDir;
}

/**
 * Gets the path for a specific OAuth provider's storage file
 * @param serverUrl The server URL or identifier for the OAuth provider
 * @returns The resolved path where the OAuth data should be stored
 */
export function getOAuthStoragePath(serverUrl: string): string {
  const authDir = ensureGlobalAuthDir();
  // Create a safe filename from the server URL
  const safeFilename = serverUrl
    .replace(/https?:\/\//, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

  return resolve(authDir, `${safeFilename}.json`);
}

// -----------------------------------------------------------------------------
// Functions from systemUtils.ts
// -----------------------------------------------------------------------------

/**
 * Gets the current project directory (internal implementation for pathUtils)
 * @returns The current working directory
 */
const getProjectDirInternal = (): string => process.cwd();

/**
 * Gets the current project directory
 * @returns The current working directory
 */
export const getProjectDir = getProjectDirInternal;

/**
 * Gets the installation directory
 * @returns The installation directory path
 * @throws Error if install directory not set
 */
export const getInstallDir = (): string => {
  if (internalPathState.installDir) {
    return internalPathState.installDir;
  }
  throw new Error('Install directory not set');
};

/**
 * Provide the path to the entry point of the application.
 * This is used to set the install directory.
 * This is called from cli.js root entry point.
 * @param indexJs The path to the entry point file
 */
export const setEntryPoint = (indexJs: string): void => {
  const filePath = fileURLToPath(indexJs);
  const dirPath = dirname(filePath);
  internalPathState.installDir = resolve(dirPath);
};

// -----------------------------------------------------------------------------
// Functions from utils.ts
// -----------------------------------------------------------------------------

/**
 * Converts a string to a file-safe format by replacing non-alphanumeric characters with dashes
 * @param string The string to convert
 * @returns A file-safe string
 */
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
