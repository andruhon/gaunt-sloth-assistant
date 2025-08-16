import { debugLog } from '#src/consoleUtils.js';

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format tool call arguments in a human-readable way
 */
export function formatToolCallArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => {
      let displayValue: string;
      if (typeof value === 'string') {
        displayValue = value;
      } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = String(value);
      }
      return `${key}: ${truncateString(displayValue, 50)}`;
    })
    .join(', ');
}

/**
 * Format a single tool call with name and arguments
 */
export function formatToolCall(
  toolName: string,
  args: Record<string, unknown>,
  prefix = ''
): string {
  const formattedArgs = formatToolCallArgs(args);
  return `${prefix}${toolName}(${formattedArgs})`;
}

/**
 * Format multiple tool calls for display (matches Invocation.ts behavior)
 */
export function formatToolCalls(
  toolCalls: Array<{ name: string; args?: Record<string, unknown> }>,
  maxLength = 255
): string {
  const formatted = toolCalls
    .map((toolCall) => {
      debugLog(JSON.stringify(toolCall));
      const formattedArgs = formatToolCallArgs(toolCall.args || {});
      return `${toolCall.name}(${formattedArgs})`;
    })
    .join(', ');

  // Truncate to maxLength characters if needed
  return formatted.length > maxLength ? formatted.slice(0, maxLength - 3) + '...' : formatted;
}

interface LLMOutput {
  messages: Array<{
    content: string;
  }>;
}

/**
 * Extracts the content of the last message from an LLM response
 * @param output - The output from the LLM containing messages
 * @returns The content of the last message
 */
export function extractLastMessageContent(output: LLMOutput): string {
  if (!output || !output.messages || !output.messages.length) {
    return '';
  }
  return output.messages[output.messages.length - 1].content;
}
