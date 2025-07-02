import chalk from 'chalk';
import * as su from '#src/systemUtils.js';
import { StatusUpdateCallback } from '#src/core/Invocation.js';
import { StatusLevel } from '#src/core/types.js';

export function displayError(message: string): void {
  su.log(chalk.red(message));
}

export function displayWarning(message: string): void {
  su.warn(chalk.yellow(message));
}

export function displaySuccess(message: string): void {
  su.log(chalk.green(message));
}

export function displayInfo(message: string): void {
  su.info(chalk.dim(message));
}

export function display(message: string): void {
  su.log(message);
}

export function formatInputPrompt(message: string): string {
  return chalk.magenta(message);
}

export function displayDebug(message: string | Error | undefined): void {
  // TODO make it controlled by config
  if (message instanceof Error) {
    su.debug(message.stack || '');
  } else if (message !== undefined) {
    su.debug(message);
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
