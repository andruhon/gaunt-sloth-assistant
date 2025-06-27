import chalk from 'chalk';
import { debug as systemDebug, error as systemError, log } from '#src/systemUtils.js';
import { StatusUpdateCallback } from '#src/core/Invocation.js';
import { StatusLevel } from '#src/core/types.js';

// TODO it seems like commander supports coloured output, maybe dependency to chalk can be removed

export function displayError(message: string): void {
  systemError(chalk.red(message));
}

export function displayWarning(message: string): void {
  systemError(chalk.yellow(message));
}

export function displaySuccess(message: string): void {
  systemError(chalk.green(message));
}

export function displayInfo(message: string): void {
  systemError(chalk.dim(message));
}

export function display(message: string): void {
  log(message);
}

export function displayDebug(message: string | Error | undefined): void {
  // TODO make it controlled by config
  if (message instanceof Error) {
    systemDebug(message.stack || '');
  } else if (message !== undefined) {
    systemDebug(message);
  }
}

// Create status update callback
export const defaultStatusCallbacks: StatusUpdateCallback = (
  level: StatusLevel,
  message: string
) => {
  switch (level) {
    case 'info':
      displayInfo(message);
      break;
    case 'warning':
      displayWarning(message);
      break;
    case 'error':
      displayError(message);
      break;
    case 'success':
      displaySuccess(message);
      break;
    case 'debug':
      displayDebug(message);
      break;
    case 'display':
      display(message);
      break;
    case 'stream':
      process.stdout.write(message);
      break;
  }
};
