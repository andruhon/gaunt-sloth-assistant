import type { Message } from '#src/modules/types.js';
import { SlothConfig } from '#src/config.js';
import { display, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { stdout } from '#src/systemUtils.js';
import { GthAgentRunner } from '#src/core/GthAgentRunner.js';
import { StatusLevel } from '#src/core/types.js';

const llmGlobalSettings = {
  verbose: false,
};

export async function invoke(
  command: 'ask' | 'pr' | 'review' | 'chat' | 'code' | undefined,
  messages: Message[],
  config: SlothConfig
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

  const invocation = new GthAgentRunner(statusUpdate);
  invocation.setVerbose(llmGlobalSettings.verbose);

  try {
    await invocation.init(command, config);
    return await invocation.processMessages(messages);
  } finally {
    await invocation.cleanup();
  }
}

export function setVerbose(debug: boolean) {
  llmGlobalSettings.verbose = debug;
}
