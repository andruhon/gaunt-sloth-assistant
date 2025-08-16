import { getInstallDir } from '#src/systemUtils.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Re-export file I/O functions from fileUtils for backward compatibility
export {
  appendToFile,
  importExternalFile,
  importFromFilePath,
  readFileFromInstallDir,
  readFileFromProjectDir,
  readFileSyncWithMessages,
  readMultipleFilesFromProjectDir,
  writeFileIfNotExistsWithMessages,
} from '#src/fileUtils.js';

export function toFileSafeString(string: string): string {
  return string.replace(/[^A-Za-z0-9]/g, '-');
}

/**
 * Returns a formatted date string in the format YYYY-MM-DD_HH-MM-SS using local time
 * @returns A formatted date string
 */
export function fileSafeLocalDate(): string {
  const date = new Date();

  // Format: YYYY-MM-DD_HH-MM-SS using local time directly
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Generates a standardized filename with the format: gth_YYYY-MM-DD_HH-MM-SS_COMMAND.md
 * @param command - The command that created the file (ASK, REVIEW, PR, etc.)
 * @returns A standardized filename string
 */
export function generateStandardFileName(command: string): string {
  const dateTimeStr = fileSafeLocalDate();
  const commandStr = toFileSafeString(command.toUpperCase());

  return `gth_${dateTimeStr}_${commandStr}.md`;
}

// Moved to processUtils.ts (Release 4) - re-exported below for backward compatibility

export function getSlothVersion(): string {
  // TODO figure out if this can be injected with TS
  const installDir = getInstallDir();
  const jsonPath = resolve(installDir, 'package.json');
  const projectJson = readFileSync(jsonPath, { encoding: 'utf8' });
  return JSON.parse(projectJson).version;
}

// Moved to processUtils.ts (Release 4) - re-exported below for backward compatibility

// Moved to formatUtils.ts (Release 4) - re-exported below for backward compatibility

// Moved to processUtils.ts (Release 4) - re-exported below for backward compatibility

/**
 * Utility function to execute hook(s) - either a single hook or an array of hooks
 * Fully type-safe and works with any number of arguments
 * @param hooks - Single hook function or array of hook functions (or undefined)
 * @param args - Arguments to pass to each hook function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeHooks<T extends (...args: any[]) => Promise<void>>(
  hooks: T | T[] | undefined,
  ...args: Parameters<T>
): Promise<void> {
  if (!hooks) return;

  if (Array.isArray(hooks)) {
    for (const hook of hooks) {
      await hook(...args);
    }
  } else {
    await hooks(...args);
  }
}

// Re-export path utilities from pathUtils.ts for backward compatibility (Release 2)
export {
  toFileSafeString as toFileSafeString_new,
  fileSafeLocalDate as fileSafeLocalDate_new,
  generateStandardFileName as generateStandardFileName_new,
} from '#src/pathUtils.js';

// Re-export process utilities from processUtils.ts for backward compatibility (Release 4)
export { spawnCommand, execAsync, ProgressIndicator } from '#src/processUtils.js';

// Re-export format utilities from formatUtils.ts for backward compatibility (Release 4)
export {
  truncateString,
  formatToolCallArgs,
  formatToolCall,
  formatToolCalls,
  extractLastMessageContent,
} from '#src/formatUtils.js';
