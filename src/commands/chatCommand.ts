import { Command } from 'commander';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';
import { initConfig } from '#src/config.js';
import { display, displayError, displaySuccess, displayWarning } from '#src/consoleUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { generateStandardFileName } from '#src/utils.js';
import { appendFileSync, existsSync } from 'node:fs';
import { invoke } from '#src/llmUtils.js';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline';
import type { Interface as ReadlineInterface } from 'node:readline';

interface ChatCommandOptions {
  message?: string;
}

let conversationContext: string[] = [];
let currentChatFile: string | null = null;

/**
 * Adds the chat command to the program
 * @param program - The commander program
 * @param readlineFactory - Optional factory for creating readline interface (for testing)
 */
export function chatCommand(
  program: Command,
  readlineFactory?: (opts: { input: NodeJS.ReadableStream; output: NodeJS.WritableStream }) => ReadlineInterface
): void {
  program
    .command('chat')
    .description('Start an interactive chat session with Gaunt Sloth')
    .argument('[message]', 'Initial message to start the chat')
    .action(async (message: string) => {
      const config = await initConfig();
      const systemPrompt = readSystemPrompt();
      const preamble = [readBackstory(), readGuidelines(config.projectGuidelines)];
      if (systemPrompt) {
        preamble.push(systemPrompt);
      }

      // Initialize conversation context
      conversationContext = [];
      currentChatFile = getGslothFilePath(generateStandardFileName('chat'));

      // Set up readline interface for continuous conversation
      const rl = createInterface({ input, output });

      // Start the conversation loop
      const askQuestion = () => {
        rl.question('> ', async (userInput) => {
          if (userInput.toLowerCase() === 'exit') {
            rl.close();
            return;
          }

          // If this is the first message and it's empty, greet the user
          if (conversationContext.length === 0 && !userInput.trim()) {
            const greeting = "Hello! I'm Gaunt Sloth, your AI assistant. How can I help you today?";
            display(greeting);
            conversationContext.push(`Assistant: ${greeting}`);
            appendFileSync(currentChatFile!, `\nAssistant: ${greeting}\n`);
            askQuestion();
            return;
          }

          await processMessage(userInput, preamble.join('\n'), config);
          askQuestion(); // Continue the conversation
        });
      };

      // Process initial message if provided
      if (message) {
        await processMessage(message, preamble.join('\n'), config);
      }

      askQuestion();
    });
}

async function processMessage(
  message: string,
  preamble: string,
  config: any
): Promise<void> {
  try {
    if (!message.trim()) {
      return; // Skip empty or whitespace-only messages
    }
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

    // Write to file if currentChatFile is valid
    if (currentChatFile) {
      const content = `\nUser: ${message}\nAssistant: ${response}\n`;
      appendFileSync(currentChatFile, content);
    } else {
      displayWarning("Warning: Chat file not initialized. Conversation not saved.");
    }

    // Display a reminder to type 'exit' to stop the conversation
    display("\nType 'exit' when you want to stop the conversation.");
  } catch (error) {
    displayError(`Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
  }
} 