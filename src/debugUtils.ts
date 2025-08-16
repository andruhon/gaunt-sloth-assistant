/**
 * @fileoverview DEPRECATED: This file is deprecated and will be removed in a future release.
 *
 * ⚠️  DEPRECATION NOTICE ⚠️
 *
 * All debug logging functionality has been moved to `#src/consoleUtils.js` as part of the
 * unified logging system. Please update your imports:
 *
 * OLD: import { debugLog, debugLogError, ... } from '#src/debugUtils.js';
 * NEW: import { debugLog, debugLogError, ... } from '#src/consoleUtils.js';
 *
 * This file provides backward compatibility re-exports but will be removed in Release 4.
 *
 * @deprecated Use `#src/consoleUtils.js` instead
 */

// Issue deprecation warning once when this module is first imported
console.warn(
  '⚠️  DEPRECATION WARNING: debugUtils.ts is deprecated. ' +
    'Please import debug logging functions from #src/consoleUtils.js instead. ' +
    'This compatibility layer will be removed in Release 4.'
);

// Re-export all debug logging functions from the unified consoleUtils
export {
  /**
   * @deprecated Use `import { initDebugLogging } from '#src/consoleUtils.js'` instead
   */
  initDebugLogging,
  /**
   * @deprecated Use `import { debugLog } from '#src/consoleUtils.js'` instead
   */
  debugLog,
  /**
   * @deprecated Use `import { debugLogMultiline } from '#src/consoleUtils.js'` instead
   */
  debugLogMultiline,
  /**
   * @deprecated Use `import { debugLogObject } from '#src/consoleUtils.js'` instead
   */
  debugLogObject,
  /**
   * @deprecated Use `import { debugLogError } from '#src/consoleUtils.js'` instead
   */
  debugLogError,
} from '#src/consoleUtils.js';
