import { initConfig } from '#src/config.js';
import {
  defaultStatusCallbacks,
  display,
  displayInfo,
  formatInputPrompt,
} from '#src/consoleUtils.js';
import { MemorySaver } from '@langchain/langgraph';
import { type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  error,
  exit,
  stdin as input,
  stdout as output,
  createInterface,
} from '#src/systemUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { appendToFile, generateStandardFileName } from '#src/utils.js';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';
import { GthAgentRunner } from '#src/core/GthAgentRunner.js';
import { RunnableConfig } from '@langchain/core/runnables';
import { getNewRunnableConfig } from '#src/llmUtils.js';

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
  const runConfig: RunnableConfig = getNewRunnableConfig();

  try {
    const rl = createInterface({ input, output });
    let isFirstMessage = true;
    let shouldExit = false;
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

      const aiResponse = await invocation.processMessages(messages, runConfig);

      const logEntry = `## User\n\n${userInput}\n\n## Assistant\n\n${aiResponse}\n\n`;
      appendToFile(logFileName, logEntry);

      isFirstMessage = false;
    };

    const askQuestion = async () => {
      while (!shouldExit) {
        const userInput = await rl.question(formatInputPrompt('  > '));
        if (!userInput.trim()) {
          continue; // Skip inference if no input
        }
        if (userInput.toLowerCase() === 'exit') {
          shouldExit = true;
          await invocation.cleanup();
          rl.close();
          return;
        }
        await processMessage(userInput);
        display('\n\n');
        displayInfo(sessionConfig.exitMessage);
      }
      rl.close();
    };

    if (message) {
      await processMessage(message);
    } else {
      display(sessionConfig.readyMessage);
      displayInfo(sessionConfig.exitMessage);
    }
    if (!shouldExit) await askQuestion();
  } catch (err) {
    await invocation.cleanup();
    error(`Error in ${sessionConfig.mode} command: ${err}`);
    exit(1);
  }
}
