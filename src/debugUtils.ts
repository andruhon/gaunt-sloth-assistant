import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { BaseMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';

const DEBUG_LOG_FILE = 'gaunt-sloth.log';
let debugEnabled = false;

/**
 * Initialize debug logging based on config
 */
export function initDebugLogging(enabled: boolean): void {
  debugEnabled = enabled;
  if (debugEnabled) {
    // Ensure the log file directory exists
    const logPath = resolve(DEBUG_LOG_FILE);
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
  if (!debugEnabled) return;

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  try {
    appendFileSync(resolve(DEBUG_LOG_FILE), logEntry, 'utf8');
  } catch (error) {
    // Ignore logging errors to prevent breaking the main flow
    console.error('Failed to write to debug log:', error);
  }
}

/**
 * Log multiple lines with proper formatting
 */
export function debugLogMultiline(title: string, content: string): void {
  if (!debugEnabled) return;

  debugLog(`=== ${title} ===`);
  debugLog(content);
  debugLog(`=== End ${title} ===\n`);
}

/**
 * Log an object as formatted JSON
 */
export function debugLogObject(title: string, obj: unknown): void {
  if (!debugEnabled) return;

  try {
    const formatted = JSON.stringify(obj, null, 2);
    debugLogMultiline(title, formatted);
  } catch (error) {
    debugLog(`Failed to serialize ${title}: ${error}`);
  }
}

/**
 * Log messages being sent to LLM
 */
export function debugLogLLMInput(messages: BaseMessage[]): void {
  if (!debugEnabled) return;

  debugLog('>>> Sending messages to LLM:');
  messages.forEach((msg, index) => {
    debugLog(`  Message ${index + 1} [${msg._getType()}]:`);
    debugLog(`    Content: ${JSON.stringify(msg.content)}`);
    if (msg.additional_kwargs && Object.keys(msg.additional_kwargs).length > 0) {
      debugLog(`    Additional kwargs: ${JSON.stringify(msg.additional_kwargs)}`);
    }
  });
  debugLog('');
}

/**
 * Log LLM response chunks during streaming
 */
export function debugLogLLMChunk(chunk: string): void {
  if (!debugEnabled) return;

  debugLog(`<<< LLM Chunk: ${JSON.stringify(chunk)}`);
}

/**
 * Log complete LLM response
 */
export function debugLogLLMResponse(response: string): void {
  if (!debugEnabled) return;

  debugLogMultiline('LLM Response', response);
}

/**
 * Log tool calls
 */
export function debugLogToolCalls(toolCalls: unknown[]): void {
  if (!debugEnabled) return;

  debugLog('🔧 Tool Calls:');
  toolCalls.forEach((call, index) => {
    debugLog(`  Tool ${index + 1}: ${JSON.stringify(call)}`);
  });
  debugLog('');
}

/**
 * Log agent initialization
 */
export function debugLogAgentInit(config: unknown): void {
  if (!debugEnabled) return;

  debugLog('=== Agent Initialization ===');
  debugLog(`Config keys: ${Object.keys(config as object).join(', ')}`);
  debugLog('');
}

/**
 * Log runnable config
 */
export function debugLogRunnableConfig(config: RunnableConfig): void {
  if (!debugEnabled) return;

  debugLogObject('Runnable Config', config);
}

/**
 * Log error with stack trace
 */
export function debugLogError(context: string, error: unknown): void {
  if (!debugEnabled) return;

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

/**
 * Log status update
 */
export function debugLogStatus(level: string, message: string): void {
  if (!debugEnabled) return;

  debugLog(`[${level.toUpperCase()}] ${message}`);
}
