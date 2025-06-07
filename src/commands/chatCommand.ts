import { Command } from 'commander';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';
import { initConfig } from '#src/config.js';
import { display, displayError, displaySuccess } from '#src/consoleUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { generateStandardFileName } from '#src/utils.js';
import { appendFileSync, existsSync } from 'node:fs';
import { invoke } from '#src/llmUtils.js';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

interface ChatCommandOptions {
  message?: string;
}

let conversationContext: string[] = [];
let currentChatFile: string | null = null;

/**
 * Adds the chat command to the program
 * @param program - The commander program
 */
export function chatCommand(program: Command): void {
  program
    .command('chat')
    .description('Start an interactive chat session with Gaunt Sloth')
    .argument('[message]', 'Initial message to start the conversation')
    .action(async (message: string, options: ChatCommandOptions) => {
      const config = await initConfig();
      const systemPrompt = readSystemPrompt();
      const preamble = [readBackstory(), readGuidelines(config.projectGuidelines)];
      if (systemPrompt) {
        preamble.push(systemPrompt);
      }

      // Initialize chat file if not already set
      if (!currentChatFile) {
        currentChatFile = getGslothFilePath(generateStandardFileName('CHAT'));
      }

      // If initial message provided, process it
      if (message) {
        await processMessage(message, preamble.join('\n'), config);
      }

      // Start interactive chat session
      const rl = createInterface({ input, output });
      
      display('\nGaunt Sloth Assistant is ready to chat! Type your message or "exit" to quit.\n');
      
      while (true) {
        const userInput = await new Promise<string>((resolve) => {
          rl.question('> ', resolve);
        });

        if (userInput.toLowerCase() === 'exit') {
          break;
        }

        await processMessage(userInput, preamble.join('\n'), config);
      }

      rl.close();
    });
}

async function processMessage(
  message: string,
  preamble: string,
  config: any
): Promise<void> {
  try {
    // Add user message to context
    conversationContext.push(`User: ${message}`);

    // Get response from LLM
    const response = await invoke(
      config.llm,
      preamble,
      conversationContext.join('\n'),
      config,
      'chat'
    );

    // Add assistant response to context
    conversationContext.push(`Assistant: ${response}`);

    // Write to file
    const content = `\nUser: ${message}\nAssistant: ${response}\n`;
    appendFileSync(currentChatFile!, content);
    
    // Display response
    display(`\n${response}\n`);
  } catch (error) {
    displayError(`Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
  }
} 