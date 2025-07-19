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
  createInterface,
  error,
  exit,
  stdin as input,
  stdout as output,
} from '#src/systemUtils.js';
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
  // Initialize Runner
  const runner = new GthAgentRunner(defaultStatusCallbacks);

  try {
    await runner.init(sessionConfig.mode, config, checkpointSaver);
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

      const aiResponse = await runner.processMessages(messages);

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
        const lowerInput = userInput.toLowerCase();
        if (lowerInput === 'exit' || lowerInput === '/exit') {
          shouldExit = true;
          await runner.cleanup();
          rl.close();
          return;
        }

        let shouldRetry = false;

        do {
          try {
            await processMessage(userInput);
            shouldRetry = false;
          } catch (err) {
            display(
              `\n❌ Error processing message: ${err instanceof Error ? err.message : String(err)}\n`
            );
            const retryResponse = await rl.question(
              'Do you want to try again with the same prompt? (y/n): '
            );
            shouldRetry = retryResponse.toLowerCase().trim().startsWith('y');
            isFirstMessage = false; // To make sure we don't resend system prompt if the first message failed

            if (!shouldRetry) {
              display('\nSkipping to next prompt...');
            }
          }
        } while (shouldRetry && !shouldExit);

        if (!shouldExit) {
          display('\n\n');
          displayInfo(sessionConfig.exitMessage);
        }
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
    await runner.cleanup();
    error(`Error in ${sessionConfig.mode} command: ${err}`);
    exit(1);
  }
}
