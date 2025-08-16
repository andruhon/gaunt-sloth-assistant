import { StatusUpdateCallback } from '#src/core/GthLangChainAgent.js';
import { StatusLevel } from '#src/core/types.js';
import { closeLogStream, initLogStream, writeToLogStream } from '#src/fileUtils.js';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inspect } from 'node:util';

// Unified logging configuration interface
export interface LogConfig {
  enableDebug: boolean;
  enableSession: boolean;
  debugFile?: string;
  sessionFile?: string;
  useColor: boolean;
}

// Internal state for session and debug logging
interface UnifiedLoggingState {
  sessionLogFile?: string;
  enableSessionLogging: boolean;
  debugLogFile: string;
  enableDebugLogging: boolean;
  useColour: boolean;
}

const unifiedLoggingState: UnifiedLoggingState = {
  sessionLogFile: undefined,
  enableSessionLogging: false,
  debugLogFile: 'gaunt-sloth.log',
  enableDebugLogging: false,
  useColour: false,
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
  if (!unifiedLoggingState.useColour) {
    return text;
  }
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}

// Color setting functions
export const getUseColour = (): boolean => {
  return unifiedLoggingState.useColour;
};

export const setUseColour = (useColour: boolean): void => {
  unifiedLoggingState.useColour = useColour;
};

// Stream-based logging function
const writeToSessionLog = (message: string): void => {
  if (unifiedLoggingState.enableSessionLogging) {
    // Strip ANSI color codes before logging to file
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    writeToLogStream(cleanMessage);
  }
};

// =============================================================================
// DEBUG LOGGING FUNCTIONS (merged from debugUtils.ts)
// =============================================================================

/**
 * Initialize debug logging based on config
 */
export function initDebugLogging(enabled: boolean): void {
  unifiedLoggingState.enableDebugLogging = enabled;
  if (enabled) {
    // Ensure the log file directory exists
    const logPath = resolve(unifiedLoggingState.debugLogFile);
    const logDir = dirname(logPath);
    try {
      mkdirSync(logDir, { recursive: true });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Log initialization
    debugLog('=== Debug logging initialized ===');
    debugLog(`Timestamp: ${new Date().toISOString()}`);
    debugLog(`Log file: ${logPath}`);
    debugLog('================================\n');
  }
}

/**
 * Log a debug message to the log file
 */
export function debugLog(message: string): void {
  if (!unifiedLoggingState.enableDebugLogging) return;

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  try {
    appendFileSync(resolve(unifiedLoggingState.debugLogFile), logEntry, 'utf8');
  } catch (error) {
    // Ignore logging errors to prevent breaking the main flow
    console.error('Failed to write to debug log:', error);
  }
}

/**
 * Log multiple lines with proper formatting
 */
export function debugLogMultiline(title: string, content: string): void {
  if (!unifiedLoggingState.enableDebugLogging) return;

  debugLog(`=== ${title} ===`);
  debugLog(content);
  debugLog(`=== End ${title} ===\n`);
}

/**
 * Log an object using Node.js inspect with reasonable depth
 */
export function debugLogObject(title: string, obj: unknown): void {
  if (!unifiedLoggingState.enableDebugLogging) return;

  try {
    // Use Node.js inspect with reasonable depth and no colors for log files
    const formatted = inspect(obj, { showHidden: false, depth: 3, colors: false });
    debugLogMultiline(title, formatted);
  } catch (error) {
    debugLog(`Failed to inspect ${title}: ${error}`);
  }
}

/**
 * Log error with stack trace
 */
export function debugLogError(context: string, error: unknown): void {
  if (!unifiedLoggingState.enableDebugLogging) return;

  debugLog(`❌ Error in ${context}:`);
  if (error instanceof Error) {
    debugLog(`  Message: ${error.message}`);
    if (error.stack) {
      debugLog('  Stack trace:');
      error.stack.split('\n').forEach((line) => debugLog(`    ${line}`));
    }
  } else {
    debugLog(`  Error: ${String(error)}`);
  }
  debugLog('');
}

// =============================================================================
// CONSOLE LOGGING FUNCTIONS (merged from systemUtils.ts)
// =============================================================================

// Console-related functions - these write directly to console streams
export const log = (message: string): void => console.log(message);
export const error = (message: string): void => console.error(message);
export const warn = (message: string): void => console.warn(message);
export const info = (message: string): void => console.info(message);
export const debug = (message: string): void => console.debug(message);
export const stream = (chunk: string): boolean => process.stdout.write(chunk);

// =============================================================================
// UNIFIED CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Configure unified logging system
 */
export function configureLogging(config: Partial<LogConfig>): void {
  if (config.enableDebug !== undefined) {
    initDebugLogging(config.enableDebug);
  }
  if (config.debugFile !== undefined) {
    unifiedLoggingState.debugLogFile = config.debugFile;
  }
  if (config.enableSession !== undefined && config.sessionFile !== undefined) {
    initSessionLogging(config.sessionFile, config.enableSession);
  }
  if (config.useColor !== undefined) {
    setUseColour(config.useColor);
  }
}

/**
 * Get current logging configuration
 */
export function getLoggingConfig(): LogConfig {
  return {
    enableDebug: unifiedLoggingState.enableDebugLogging,
    enableSession: unifiedLoggingState.enableSessionLogging,
    debugFile: unifiedLoggingState.debugLogFile,
    sessionFile: unifiedLoggingState.sessionLogFile,
    useColor: unifiedLoggingState.useColour,
  };
}

// =============================================================================
// SESSION LOGGING FUNCTIONS
// =============================================================================

// Public functions for session logging management
export const initSessionLogging = (logFileName: string, enableLogging: boolean): void => {
  unifiedLoggingState.sessionLogFile = enableLogging ? logFileName : undefined;
  unifiedLoggingState.enableSessionLogging = enableLogging;

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
  unifiedLoggingState.sessionLogFile = undefined;
  unifiedLoggingState.enableSessionLogging = false;
};

// =============================================================================
// DISPLAY FUNCTIONS (enhanced with unified logging)
// =============================================================================

export function displayError(message: string): void {
  const coloredMessage = colorText(message, 'red');
  writeToSessionLog(message + '\n');
  log(coloredMessage);
}

export function displayWarning(message: string): void {
  const coloredMessage = colorText(message, 'yellow');
  writeToSessionLog(message + '\n');
  warn(coloredMessage);
}

export function displaySuccess(message: string): void {
  const coloredMessage = colorText(message, 'green');
  writeToSessionLog(message + '\n');
  log(coloredMessage);
}

export function displayInfo(message: string): void {
  const coloredMessage = colorText(message, 'dim');
  writeToSessionLog(message + '\n');
  info(coloredMessage);
}

export function display(message: string): void {
  writeToSessionLog(message + '\n');
  log(message);
}

export function formatInputPrompt(message: string): string {
  return colorText(message, 'magenta');
}

export function displayDebug(message: string | Error | undefined): void {
  // TODO make it controlled by config
  if (message instanceof Error) {
    const stackTrace = message.stack || '';
    writeToSessionLog(stackTrace + '\n');
    debug(stackTrace);
  } else if (message !== undefined) {
    writeToSessionLog(message + '\n');
    debug(message);
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
