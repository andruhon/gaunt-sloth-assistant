import type { Message } from '#src/modules/types.js';
import { SlothConfig } from '#src/config.js';
import { display, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { stdout } from '#src/systemUtils.js';
import { type RunnableConfig } from '@langchain/core/runnables';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { Invocation } from '#src/core/Invocation.js';
import { StatusLevel } from '#src/core/types.js';

const llmGlobalSettings = {
  verbose: false,
};

export async function invoke(
  command: 'ask' | 'pr' | 'review' | 'chat' | 'code' | undefined,
  messages: Message[],
  config: SlothConfig,
  runConfig?: RunnableConfig,
  checkpointSaver?: BaseCheckpointSaver | undefined
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

  const invocation = new Invocation(statusUpdate);
  invocation.setVerbose(llmGlobalSettings.verbose);

  try {
    await invocation.init(command, config, checkpointSaver);
    return await invocation.invoke(messages, runConfig);
  } finally {
    await invocation.cleanup();
  }
}

export function setVerbose(debug: boolean) {
  llmGlobalSettings.verbose = debug;
}
