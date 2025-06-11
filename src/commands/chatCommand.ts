import { initConfig } from '#src/config.js';
import { display } from '#src/consoleUtils.js';
import { invoke } from '#src/llmUtils.js';
import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { MemorySaver } from '@langchain/langgraph';
import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import {
  createInterface,
  error,
  exit,
  stdin as input,
  stdout as output,
} from '#src/systemUtils.js';
import { RunnableConfig } from '@langchain/core/runnables';

export function chatCommand(program: Command) {
  program
    .command('chat')
    .description('Start an interactive chat session with Gaunt Sloth')
    .argument('[message]', 'Initial message to start the chat')
    .action(async (message: string) => {
      try {
        const config = await initConfig();
        const memory = new MemorySaver();
        const rl = createInterface({ input, output });
        let isFirstMessage = true;
        let shouldExit = false;
        const thread_id = uuidv4();

        const processMessage = async (userInput: string) => {
          const messages: BaseMessage[] = [];
          if (isFirstMessage) {
            messages.push(new SystemMessage('You are a helpful AI assistant.'));
          }
          messages.push(new HumanMessage(userInput));

          const runConfig = {
            configurable: { thread_id },
            checkpointer: memory,
          } as RunnableConfig;

          await invoke(
            'chat',
            messages,
            config,
            runConfig
          );

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
              display(
                "Hello! I'm Gaunt Sloth, your AI assistant. How can I help you today?"
              );
              rl.close();
              return;
            }
            if (!userInput.trim()) {
              rl.close();
              return;
            }
            await processMessage(userInput);
            if (!shouldExit) askQuestion();
          });
        };

        if (message) {
          await processMessage(message);
        }
        if (!shouldExit) askQuestion();
      } catch (err) {
        error('Error in chat command:', err);
        exit(1);
      }
    });
}
