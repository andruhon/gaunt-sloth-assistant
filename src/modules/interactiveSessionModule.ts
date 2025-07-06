import { initConfig } from '#src/config.js';
import {
  defaultStatusCallbacks,
  display,
  displayInfo,
  formatInputPrompt,
} from '#src/consoleUtils.js';
import * as crypto from 'crypto';
import { MemorySaver } from '@langchain/langgraph';
import { type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  createInterface,
  error,
  exit,
  stdin as input,
  stdout as output,
} from '#src/systemUtils.js';
import { RunnableConfig } from '@langchain/core/runnables';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { appendToFile, generateStandardFileName } from '#src/utils.js';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';
import { GthAgentRunner } from '#src/core/GthAgentRunner.js';

export interface SessionConfig {
  mode: 'chat' | 'code';
  readModePrompt: () => string | null;
  description: string;
  readyMessage: string;
  exitMessage: string;
}

export async function createInteractiveSession(sessionConfig: SessionConfig, message?: string) {
  const config = { ...(await initConfig()) };
  const checkpointSaver = new MemorySaver();
  // Initialize Invocation once
  const invocation = new GthAgentRunner(defaultStatusCallbacks);
  await invocation.init(sessionConfig.mode, config, checkpointSaver);

  try {
    const rl = createInterface({ input, output });
    let isFirstMessage = true;
    let shouldExit = false;
    const thread_id = crypto.randomUUID();
    const logFileName = getGslothFilePath(
      generateStandardFileName(sessionConfig.mode.toUpperCase())
    );

    displayInfo(`${sessionConfig.mode} session will be logged to ${logFileName}\n`);

    const processMessage = async (userInput: string) => {
      const messages: BaseMessage[] = [];
      if (isFirstMessage) {
        const systemPromptParts = [readBackstory(), readGuidelines(config.projectGuidelines)];
        const modePrompt = sessionConfig.readModePrompt();
        if (modePrompt) {
          systemPromptParts.push(modePrompt);
        }
        const systemPrompt = readSystemPrompt();
        if (systemPrompt) {
          systemPromptParts.push(systemPrompt);
        }
        messages.push(new SystemMessage(systemPromptParts.join('\n')));
      }
      messages.push(new HumanMessage(userInput));

      const runConfig = {
        configurable: { thread_id },
        recursionLimit: 250,
      } as RunnableConfig;

      const aiResponse = await invocation.processMessages(messages, runConfig);

      const logEntry = `## User\n\n${userInput}\n\n## Assistant\n\n${aiResponse}\n\n`;
      appendToFile(logFileName, logEntry);

      isFirstMessage = false;
    };

    const askQuestion = () => {
      rl.question(formatInputPrompt('  > '), async (userInput) => {
        if (!userInput.trim()) {
          rl.close(); // This is not the end of the loop, simply skipping inference if no input
          return;
        }
        if (userInput.toLowerCase() === 'exit') {
          rl.close();
          shouldExit = true;
          await invocation.cleanup();
          return;
        }
        await processMessage(userInput);
        display('\n\n');
        displayInfo(sessionConfig.exitMessage);
        if (!shouldExit) askQuestion();
      });
    };

    if (message) {
      await processMessage(message);
    } else {
      display(sessionConfig.readyMessage);
      displayInfo(sessionConfig.exitMessage);
    }
    if (!shouldExit) askQuestion();
  } catch (err) {
    await invocation.cleanup();
    error(`Error in ${sessionConfig.mode} command: ${err}`);
    exit(1);
  }
}
