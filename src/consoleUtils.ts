import { StatusUpdateCallback } from '#src/core/GthLangChainAgent.js';
import { StatusLevel } from '#src/core/types.js';
import * as su from '#src/systemUtils.js';
import { closeLogStream, initLogStream, stream, writeToLogStream } from '#src/systemUtils.js';

// Internal state for session logging
interface LoggingState {
  sessionLogFile?: string;
  enableSessionLogging: boolean;
}

const loggingState: LoggingState = {
  sessionLogFile: undefined,
  enableSessionLogging: false,
};

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

// Stream-based logging function
const writeToSessionLog = (message: string): void => {
  if (loggingState.enableSessionLogging) {
    // Strip ANSI color codes before logging to file
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    writeToLogStream(cleanMessage);
  }
};

// Public functions for session logging management
export const initSessionLogging = (logFileName: string, enableLogging: boolean): void => {
  loggingState.sessionLogFile = enableLogging ? logFileName : undefined;
  loggingState.enableSessionLogging = enableLogging;

  if (enableLogging && logFileName) {
    initLogStream(logFileName);
  }
};

export const flushSessionLog = (): void => {
  // Streams auto-flush, so this is now a no-op for API compatibility
  // Could potentially force flush if needed in the future
};

export const stopSessionLogging = (): void => {
  closeLogStream();
  loggingState.sessionLogFile = undefined;
  loggingState.enableSessionLogging = false;
};

export function displayError(message: string): void {
  const coloredMessage = colorText(message, 'red');
  writeToSessionLog(message + '\n');
  su.log(coloredMessage);
}

export function displayWarning(message: string): void {
  const coloredMessage = colorText(message, 'yellow');
  writeToSessionLog(message + '\n');
  su.warn(coloredMessage);
}

export function displaySuccess(message: string): void {
  const coloredMessage = colorText(message, 'green');
  writeToSessionLog(message + '\n');
  su.log(coloredMessage);
}

export function displayInfo(message: string): void {
  const coloredMessage = colorText(message, 'dim');
  writeToSessionLog(message + '\n');
  su.info(coloredMessage);
}

export function display(message: string): void {
  writeToSessionLog(message + '\n');
  su.log(message);
}

export function formatInputPrompt(message: string): string {
  return colorText(message, 'magenta');
}

export function displayDebug(message: string | Error | undefined): void {
  // TODO make it controlled by config
  if (message instanceof Error) {
    const stackTrace = message.stack || '';
    writeToSessionLog(stackTrace + '\n');
    su.debug(stackTrace);
  } else if (message !== undefined) {
    writeToSessionLog(message + '\n');
    su.debug(message);
  }
}

// Create status update callback
export const defaultStatusCallback: StatusUpdateCallback = (
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
      writeToSessionLog(message);
      stream(message);
      break;
  }
};
