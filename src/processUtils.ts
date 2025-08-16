import { displayError, displaySuccess, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { stdout } from '#src/systemUtils.js';
import { spawn } from 'node:child_process';

interface SpawnOutput {
  stdout: string;
  stderr: string;
}

export async function spawnCommand(
  command: string,
  args: string[],
  progressMessage: string,
  successMessage: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const progressIndicator = new ProgressIndicator(progressMessage, true);
    const out: SpawnOutput = { stdout: '', stderr: '' };
    const spawned = spawn(command, args);

    spawned.stdout.on('data', async (stdoutChunk) => {
      progressIndicator.indicate();
      out.stdout += stdoutChunk.toString();
    });

    spawned.stderr.on('data', (err) => {
      progressIndicator.indicate();
      out.stderr += err.toString();
    });

    spawned.on('error', (err) => {
      reject(err.toString());
    });

    spawned.on('close', (code) => {
      if (code === 0) {
        displaySuccess(successMessage);
        resolve(out.stdout);
      } else {
        displayError(`Failed to spawn command with code ${code}`);
        reject(out.stdout + ' ' + out.stderr);
      }
    });
  });
}

export async function execAsync(command: string): Promise<string> {
  const { exec } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(new Error(stderr));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export class ProgressIndicator {
  private interval: number | undefined = undefined;

  constructor(initialMessage: string, manual?: boolean) {
    stdout.write(initialMessage);
    if (!manual) {
      this.interval = setInterval(this.indicateInner, 1000) as unknown as number;
    }
  }

  private indicateInner(): void {
    stdout.write('.');
  }

  indicate(): void {
    if (this.interval) {
      throw new Error('ProgressIndicator.indicate only to be called in manual mode');
    }
    this.indicateInner();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    stdout.write('\n');
  }
}

// System interaction utilities moved from systemUtils.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keypressHandler = (callback: () => void) => (_: any, key: any) => {
  if (key?.name === 'escape' || key?.name === 'q') {
    displayWarning('\nInterrupting...');
    callback();
    return;
  }
};

interface InnerState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  waitForEscapeCallback?: (_: any, key: any) => void;
}

const innerState: InnerState = {
  waitForEscapeCallback: undefined,
};

export const waitForEscape = (callback: () => void, enabled: boolean) => {
  if (!enabled) {
    return;
  }
  process.stdin.setRawMode(true);
  innerState.waitForEscapeCallback = keypressHandler(callback);
  process.stdin.on('keypress', innerState.waitForEscapeCallback);
  displayInfo(`
  ┌--------------------------------------┐
  │ Press Escape or Q to interrupt Agent │
  └--------------------------------------┘
  `);
};

export const stopWaitingForEscape = () => {
  if (innerState.waitForEscapeCallback) {
    process.stdin.setRawMode(false);
    process.stdin.off('keypress', innerState.waitForEscapeCallback);
    innerState.waitForEscapeCallback = undefined;
  }
};

export const setRawMode = (rawMode: boolean) => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(rawMode);
  }
};
