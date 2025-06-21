import { initConfig } from '#src/config.js';
import { display } from '#src/consoleUtils.js';
import { invoke } from '#src/llmUtils.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import {
  createInterface,
  error,
  exit,
  stdin as input,
  stdout as output,
} from '#src/systemUtils.js';
import { RunnableConfig } from '@langchain/core/runnables';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { generateStandardFileName, appendToFile } from '#src/utils.js';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';

export interface SessionConfig {
  mode: 'chat' | 'code';
  readModePrompt: () => string | null;
  description: string;
  readyMessage: string;
  exitMessage: string;
}

export async function createInteractiveSession(sessionConfig: SessionConfig, message?: string) {
  try {
    const config = { ...(await initConfig()), streamOutput: false };
    const checkpointSaver = new MemorySaver();
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

      const aiResponse = await invoke(
        sessionConfig.mode,
        messages,
        config,
        runConfig,
        checkpointSaver
      );

      const logEntry = `## User\n\n${userInput}\n\n## Assistant\n\n${aiResponse}\n\n`;
      appendToFile(logFileName, logEntry);

      isFirstMessage = false;
    };

    const askQuestion = () => {
      rl.question(chalk.magenta('  > '), async (userInput) => {
        if (userInput.toLowerCase() === 'exit') {
          rl.close();
          shouldExit = true;
          return;
        }
        if (isFirstMessage && !userInput.trim()) {
          rl.close();
          return;
        }
        if (!userInput.trim()) {
          rl.close();
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
    error(`Error in ${sessionConfig.mode} command: ${err}`);
    exit(1);
  }
}
