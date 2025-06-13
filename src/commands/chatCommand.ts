import { initConfig } from '#src/config.js';
import { display } from '#src/consoleUtils.js';
import { invoke } from '#src/llmUtils.js';
import { Command } from 'commander';
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

export function chatCommand(program: Command) {
  program
    .command('chat')
    .description('Start an interactive chat session with Gaunt Sloth')
    .argument('[message]', 'Initial message to start the chat')
    .action(async (message: string) => {
      try {
        // Force streaming Off for chat, it does not play nicely with the input interface
        const config = { ...(await initConfig()), streamOutput: false };
        const checkpointSaver = new MemorySaver();
        const rl = createInterface({ input, output });
        let isFirstMessage = true;
        let shouldExit = false;
        const thread_id = uuidv4();
        const chatLogFileName = getGslothFilePath(generateStandardFileName('CHAT'));

        display(chalk.gray(`Chat session will be logged to ${chatLogFileName}\n`));

        const processMessage = async (userInput: string) => {
          const messages: BaseMessage[] = [];
          if (isFirstMessage) {
            messages.push(new SystemMessage('You are a helpful AI assistant.'));
          }
          messages.push(new HumanMessage(userInput));

          const runConfig = {
            configurable: { thread_id },
          } as RunnableConfig;

          const aiResponse = await invoke('chat', messages, config, runConfig, checkpointSaver);

          const logEntry = `## User\n\n${userInput}\n\n## Assistant\n\n${aiResponse}\n\n`;
          appendToFile(chatLogFileName, logEntry);

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
            display(chalk.gray("Type 'exit' or hit Ctrl+C to exit chat\n"));
            if (!shouldExit) askQuestion();
          });
        };

        if (message) {
          await processMessage(message);
        } else {
          display('\nGaunt Sloth is ready to chat. Type your prompt.');
          display(chalk.gray("Type 'exit' or hit Ctrl+C to exit chat\n"));
        }
        if (!shouldExit) askQuestion();
      } catch (err) {
        error(`Error in chat command: ${err}`);
        exit(1);
      }
    });
}
