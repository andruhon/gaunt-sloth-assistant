import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { ProgressIndicator } from '#src/utils.js';
import { createInterface, type Interface as ReadLineInterface } from 'node:readline/promises';
import { displayInfo, displayWarning } from './consoleUtils.js';

// Re-export log stream functions from fileUtils for backward compatibility
export { closeLogStream, initLogStream, writeToLogStream } from '#src/fileUtils.js';

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
  stringFromStdin: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  waitForEscapeCallback?: (_: any, key: any) => void;
}

const innerState: InnerState = {
  installDir: undefined,
  stringFromStdin: '',
  waitForEscapeCallback: undefined,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keypressHandler = (callback: () => void) => (_: any, key: any) => {
  if (key?.name === 'escape' || key?.name === 'q') {
    displayWarning('\nInterrupting...');
    callback();
    return;
  }
};

export const waitForEscape = (callback: () => void, enabled: boolean) => {
  if (!enabled) {
    return;
  }
  process.stdin.setRawMode(true);
  innerState.waitForEscapeCallback = keypressHandler(callback);
  process.stdin.on('keypress', innerState.waitForEscapeCallback);
  displayInfo(`
  ┌--------------------------------------┐
  │ Press Escape or Q to interrupt Agent │
  └--------------------------------------┘
  `);
};

export const stopWaitingForEscape = () => {
  if (innerState.waitForEscapeCallback) {
    process.stdin.setRawMode(false);
    process.stdin.off('keypress', innerState.waitForEscapeCallback);
    innerState.waitForEscapeCallback = undefined;
  }
};

export const setRawMode = (rawMode: boolean) => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(rawMode);
  }
};

// Process-related functions and objects
export const getProjectDir = (): string => process.cwd();
export const getInstallDir = (): string => {
  if (innerState.installDir) {
    return innerState.installDir;
  }
  throw new Error('Install directory not set');
};
/**
 * Cached string from stdin. Should only be called after readStdin completes execution.
 */
export const getStringFromStdin = (): string => {
  return innerState.stringFromStdin;
};

// useColour functions moved to consoleUtils.ts and re-exported below

export const isTTY = (): boolean => !!stdin.isTTY;

export const exit = (code?: number): never => process.exit(code || 0);
export const stdin = process.stdin;
export const stdout = process.stdout;
export const argv = process.argv;
export const env = process.env;
export { createInterface };
export type { ReadLineInterface };

// noinspection JSUnusedGlobalSymbols
/**
 * Provide the path to the entry point of the application.
 * This is used to set the install directory.
 * This is called from cli.js root entry point.
 */
export const setEntryPoint = (indexJs: string): void => {
  const filePath = fileURLToPath(indexJs);
  const dirPath = dirname(filePath);
  innerState.installDir = resolve(dirPath);
};

/**
 * Asynchronously reads the stdin and stores it as a string,
 * it can later be retrieved with getStringFromStdin.
 */
export function readStdin(program: Command): Promise<void> {
  return new Promise((resolvePromise) => {
    if (stdin.isTTY || program.getOptionValue('nopipe')) {
      program.parseAsync().then(() => resolvePromise());
    } else {
      // Support piping diff into gsloth
      const progressIndicator = new ProgressIndicator('reading STDIN', true);

      stdin.on('readable', function (this: NodeJS.ReadStream) {
        const chunk = this.read();
        progressIndicator.indicate();
        if (chunk !== null) {
          const chunkStr = chunk.toString('utf8');
          innerState.stringFromStdin = innerState.stringFromStdin + chunkStr;
        }
      });

      stdin.on('end', function () {
        program.parseAsync(argv).then(() => resolvePromise());
      });
    }
  });
}

// Console-related functions, color functions, and debug functions - re-exported from consoleUtils.ts for backward compatibility
export {
  log,
  error,
  warn,
  info,
  debug,
  stream,
  getUseColour,
  setUseColour,
  // Debug functions for backward compatibility
  initDebugLogging,
  debugLog,
  debugLogMultiline,
  debugLogObject,
  debugLogError,
  // Unified logging configuration
  configureLogging,
  getLoggingConfig,
  type LogConfig,
} from '#src/consoleUtils.js';

// Re-export path utilities from pathUtils.ts for backward compatibility (Release 2)
export {
  getProjectDir as getProjectDir_new,
  getInstallDir as getInstallDir_new,
  setEntryPoint as setEntryPoint_new,
} from '#src/pathUtils.js';
