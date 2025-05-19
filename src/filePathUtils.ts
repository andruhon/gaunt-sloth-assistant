import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { getCurrentDir } from '#src/systemUtils.js';

const GSLOTH_DIR = '.gsloth';
const GSLOTH_SETTINGS_DIR = '.gsloth-settings';

/**
 * Checks if .gsloth directory exists in the project root
 * @returns Boolean indicating whether .gsloth directory exists
 */
export function gslothDirExists(): boolean {
  const currentDir = getCurrentDir();
  const gslothDirPath = resolve(currentDir, GSLOTH_DIR);
  return existsSync(gslothDirPath);
}

/**
 * Gets the path where gsloth should write files based on .gsloth directory existence
 * @param filename The filename to append to the path
 * @returns The resolved path where the file should be written
 */
export function getGslothFilePath(filename: string): string {
  const currentDir = getCurrentDir();

  if (gslothDirExists()) {
    const gslothDirPath = resolve(currentDir, GSLOTH_DIR);
    return resolve(gslothDirPath, filename);
  }

  return resolve(currentDir, filename);
}

/**
 * Gets the path where gsloth should write configuration files based on .gsloth directory existence
 * @param filename The configuration filename
 * @returns The resolved path where the configuration file should be written
 */
export function getGslothConfigPath(filename: string): string {
  const currentDir = getCurrentDir();

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
  const currentDir = getCurrentDir();

  if (gslothDirExists()) {
    const gslothDirPath = resolve(currentDir, GSLOTH_DIR);
    const gslothSettingsPath = resolve(gslothDirPath, GSLOTH_SETTINGS_DIR);
    const configPath = resolve(gslothSettingsPath, filename);

    if (existsSync(configPath)) {
      return configPath;
    }
  }

  return resolve(currentDir, filename);
}
