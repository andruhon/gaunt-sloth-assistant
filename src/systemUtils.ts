import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';

/**
 * This file contains all system functions and objects that are globally available
 * but not imported directly, such as process.stdin, process.stdout, process.argv,
 * process.env, process.cwd(), process.exit(), etc.
 *
 * By centralizing these in one file, we improve testability and make it easier
 * to mock these dependencies in tests.
 */

interface InnerState {
  installDir: string | null | undefined;
}

const innerState: InnerState = {
  installDir: undefined,
};

// Process-related functions and objects
export const getCurrentDir = (): string => process.cwd();
export const getInstallDir = (): string => {
  if (innerState.installDir) {
    return innerState.installDir;
  }
  throw new Error('Install directory not set');
};
export const exit = (code?: number): never => process.exit(code || 0);
export const stdin = process.stdin;
export const stdout = process.stdout;
export const argv = process.argv;
export const env = process.env;

// noinspection JSUnusedGlobalSymbols
/**
 * Provide the path to the entry point of the application.
 * This is used to set the install directory.
 * This is called from index.js root entry point.
 */
export const setEntryPoint = (indexJs: string): void => {
  const filePath = fileURLToPath(indexJs);
  const dirPath = dirname(filePath);
  innerState.installDir = resolve(dirPath);
};

// Console-related functions
export const log = (message: string): void => console.log(message);
export const error = (message: string): void => console.error(message);
export const warn = (message: string): void => console.warn(message);
export const info = (message: string): void => console.info(message);
export const debug = (message: string): void => console.debug(message);
