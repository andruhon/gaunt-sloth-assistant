import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Runs a command in the integration-tests directory using exec
 * Note: This method may cause stdin to be detected as a pipe
 * @param command - The command to run
 * @returns The command output as a string
 */
export async function runCommandInTestDir(command: string): Promise<string> {
  const testDir = path.resolve('./integration-tests');
  try {
    const { stdout } = await execAsync(command, {
      cwd: testDir,
      env: {
        ...process.env,
        // Add any environment variables needed for testing
        // For example, if using Claude, you might need:
        // ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
    });
    return stdout;
  } catch (e) {
    throw new Error(`Command failed: ${command}\n${e.message}`);
  }
}

/**
 * Runs a command in the integration-tests directory using spawn
 * This prevents stdin from being treated as a pipe
 * @param command - The main command to run
 * @param args - The command arguments
 * @returns The command output as a string
 */
export async function runCommandWithArgs(command: string, args: string[]): Promise<string> {
  const testDir = path.resolve('./integration-tests');
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const childProcess = spawn(command, args, {
      cwd: testDir,
      env: {
        ...process.env,
      },
      // Explicitly ignore stdin, otherwise the app switches to pipe mode
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with code ${code}\n${stderr}`));
      }
    });
  });
}
