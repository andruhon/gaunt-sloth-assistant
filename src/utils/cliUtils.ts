/**
 * cliUtils.ts
 *
 * Utilities for parsing CLI option values.
 *
 * This module provides a reusable parser for CLI flags that can accept either:
 * - boolean-like values (true/false, 1/0, yes/no, y/n)
 * - arbitrary string values (e.g., file paths)
 *
 * It is designed to work well with Commander-style short options where the value
 * may be concatenated without a space, e.g.:
 *   -w0, -wn, -wreview.md
 */

/**
 * Result of attempting to parse a CLI value as boolean-or-string.
 * When kind === 'boolean', value is a boolean.
 * When kind === 'string', value is a non-empty string.
 * When kind === 'none', no usable value was provided (undefined/null/empty).
 */
export type BooleanOrStringParseResult =
  | { kind: 'boolean'; value: boolean }
  | { kind: 'string'; value: string }
  | { kind: 'none' };

/**
 * Parse a CLI option value into either:
 * - a boolean (when value looks like a true/false token),
 * - a non-empty string (otherwise),
 * - or none (when value is nullish or only whitespace).
 *
 * Recognized false-like tokens (case-insensitive): 'false', '0', 'n', 'no'
 * Recognized true-like tokens (case-insensitive):  'true', '1', 'y', 'yes'
 *
 * Examples:
 *  parseBooleanOrString('n')         => { kind: 'boolean', value: false }
 *  parseBooleanOrString('0')         => { kind: 'boolean', value: false }
 *  parseBooleanOrString('true')      => { kind: 'boolean', value: true }
 *  parseBooleanOrString('1')         => { kind: 'boolean', value: true }
 *  parseBooleanOrString('review.md') => { kind: 'string',  value: 'review.md' }
 *  parseBooleanOrString('  ')        => { kind: 'none' }
 *  parseBooleanOrString(undefined)   => { kind: 'none' }
 */
export function parseBooleanOrString(value: unknown): BooleanOrStringParseResult {
  if (value === undefined || value === null) {
    return { kind: 'none' };
  }

  const str = String(value);
  const trimmed = str.trim();
  if (trimmed.length === 0) {
    return { kind: 'none' };
  }

  const lower = trimmed.toLowerCase();

  // False-like tokens
  if (lower === 'false' || lower === '0' || lower === 'n' || lower === 'no') {
    return { kind: 'boolean', value: false };
  }

  // True-like tokens
  if (lower === 'true' || lower === '1' || lower === 'y' || lower === 'yes') {
    return { kind: 'boolean', value: true };
  }

  // Otherwise, treat as a string (e.g., filename/path)
  return { kind: 'string', value: trimmed };
}

/**
 * Convenience wrapper that returns a union directly instead of the tagged result.
 *
 * Returns:
 * - boolean when the input is a boolean-like token
 * - string when the input is non-empty and not a boolean-like token
 * - undefined when the input is nullish or empty/whitespace
 */
export function coerceBooleanOrString(value: unknown): boolean | string | undefined {
  const parsed = parseBooleanOrString(value);
  switch (parsed.kind) {
    case 'boolean':
      return parsed.value;
    case 'string':
      return parsed.value;
    default:
      return undefined;
  }
}
