import { spawn } from 'child_process';
import path from 'path';

/**
 * Runs a command in the integration-tests directory using spawn
 * This prevents stdin from being treated as a pipe
 * @param command - The main command to run
 * @param args - The command arguments
 * @param endOutput - Output which will terminate the execution
 * @returns The command output as a string
 */
export async function runCommandWithArgs(
  command: string,
  args: string[],
  endOutput?: string
): Promise<string> {
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
      if (endOutput && data.toString().includes(endOutput)) {
        childProcess.kill();
        resolve(stdout.trim());
        return;
      }
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      console.log(code);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with code ${code}\n${stderr}`));
      }
    });
  });
}
