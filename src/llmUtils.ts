import type { Message } from '#src/modules/types.js';
import { GthConfig } from '#src/config.js';
import { display, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { stdout } from '#src/systemUtils.js';
import { GthAgentRunner } from '#src/core/GthAgentRunner.js';
import { StatusLevel } from '#src/core/types.js';
import { randomUUID } from 'crypto';
import { RunnableConfig } from '@langchain/core/runnables';

export const llmGlobalSettings = {
  verbose: false,
};

/**
 * @deprecated prefer using src/core/GthAgentRunner.ts directly
 */
export async function invoke(
  command: 'ask' | 'pr' | 'review' | 'chat' | 'code' | undefined,
  messages: Message[],
  config: GthConfig
): Promise<string> {
  const statusUpdate = (level: StatusLevel, message: string) => {
    switch (level) {
      case 'display':
        display(message);
        break;
      case 'info':
        displayInfo(message);
        break;
      case 'warning':
        displayWarning(message);
        break;
      case 'error':
        displayError(message);
        break;
      case 'stream':
        stdout.write(message, 'utf-8');
        break;
      default:
        display(message);
        break;
    }
  };

  const runner = new GthAgentRunner(statusUpdate);
  runner.setVerbose(llmGlobalSettings.verbose);

  try {
    await runner.init(command, config);
    return await runner.processMessages(messages);
  } finally {
    await runner.cleanup();
  }
}

// TODO make sure that it still works after refactoring
export function setVerbose(debug: boolean) {
  llmGlobalSettings.verbose = debug;
}

/**
 * Creates new runnable config.
 * configurable.thread_id is an important part of that because it helps to distinguish different chat sessions.
 * We normally do not have multiple sessions in the terminal, but I had bad stuff happening in tests
 * and in another prototype project where I was importing Gaunt Sloth.
 */
export function getNewRunnableConfig(): RunnableConfig {
  return {
    recursionLimit: 250,
    configurable: { thread_id: randomUUID() },
  };
}
