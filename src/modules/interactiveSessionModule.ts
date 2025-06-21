import { initConfig } from '#src/config.js';
import { defaultStatusCallbacks, display } from '#src/consoleUtils.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
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
import { Invocation } from '#src/core/Invocation.js';

export interface SessionConfig {
  mode: 'chat' | 'code';
  readModePrompt: () => string | null;
  description: string;
  readyMessage: string;
  exitMessage: string;
}

export async function createInteractiveSession(sessionConfig: SessionConfig, message?: string) {
  const config = { ...(await initConfig()), streamOutput: false };
  const checkpointSaver = new MemorySaver();
  // Initialize Invocation once
  const invocation = new Invocation(defaultStatusCallbacks);
  await invocation.init(sessionConfig.mode, config, checkpointSaver);

  try {
    const rl = createInterface({ input, output });
    let isFirstMessage = true;
    let shouldExit = false;
    const thread_id = uuidv4();
    const logFileName = getGslothFilePath(
      generateStandardFileName(sessionConfig.mode.toUpperCase())
    );

    display(chalk.gray(`${sessionConfig.mode} session will be logged to ${logFileName}\n`));

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
      } as RunnableConfig;

      const aiResponse = await invocation.invoke(messages, runConfig);

      const logEntry = `## User\n\n${userInput}\n\n## Assistant\n\n${aiResponse}\n\n`;
      appendToFile(logFileName, logEntry);

      isFirstMessage = false;
    };

    const askQuestion = () => {
      rl.question(chalk.magenta('  > '), async (userInput) => {
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
        display(chalk.gray(sessionConfig.exitMessage));
        if (!shouldExit) askQuestion();
      });
    };

    if (message) {
      await processMessage(message);
    } else {
      display(sessionConfig.readyMessage);
      display(chalk.gray(sessionConfig.exitMessage));
    }
    if (!shouldExit) askQuestion();
  } catch (err) {
    await invocation.cleanup();
    error(`Error in ${sessionConfig.mode} command: ${err}`);
    exit(1);
  }
}
