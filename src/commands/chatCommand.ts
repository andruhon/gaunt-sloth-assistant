import { Command } from 'commander';
import { createInteractiveSession, SessionConfig } from '#src/modules/interactiveSessionModule.js';
import { readChatPrompt } from '#src/prompt.js';

export function chatCommand(program: Command) {
  program
    .command('chat')
    .description('Start an interactive chat session with Gaunt Sloth')
    .argument('[message]', 'Initial message to start the chat')
    .action(async (message: string) => {
      const sessionConfig: SessionConfig = {
        mode: 'chat',
        readModePrompt: readChatPrompt,
        description: 'Start an interactive chat session with Gaunt Sloth',
        readyMessage: '\nGaunt Sloth is ready to chat. Type your prompt.',
        exitMessage: "Type 'exit' or hit Ctrl+C to exit chat\n",
      };

      await createInteractiveSession(sessionConfig, message);
    });
}
