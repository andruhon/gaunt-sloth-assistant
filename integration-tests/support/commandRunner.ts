import { execSync } from 'child_process';
import path from 'path';

/**
 * Runs a command in the integration-tests directory
 * @param command - The command to run
 * @returns The command output as a string
 */
export function runCommandInTestDir(command: string): string {
  const testDir = path.resolve('./integration-tests');
  try {
    return execSync(command, {
      cwd: testDir,
      env: {
        ...process.env,
        // Add any environment variables needed for testing
        // For example, if using Claude, you might need:
        // ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
    }).toString();
  } catch (e) {
    throw new Error(`Command failed: ${command}\n${e.message}`);
  }
}
