import * as su from '#src/systemUtils.js';
import { StatusUpdateCallback } from '#src/core/GthReactAgent.js';
import { StatusLevel } from '#src/core/types.js';

// ANSI color codes
const ANSI_COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

// Helper functions for ANSI coloring
function colorText(text: string, color: keyof typeof ANSI_COLORS): string {
  if (!su.getUseColour()) {
    return text;
  }
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}

export function displayError(message: string): void {
  su.log(colorText(message, 'red'));
}

export function displayWarning(message: string): void {
  su.warn(colorText(message, 'yellow'));
}

export function displaySuccess(message: string): void {
  su.log(colorText(message, 'green'));
}

export function displayInfo(message: string): void {
  su.info(colorText(message, 'dim'));
}

export function display(message: string): void {
  su.log(message);
}

export function formatInputPrompt(message: string): string {
  return colorText(message, 'magenta');
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
