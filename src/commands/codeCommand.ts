import { Command } from 'commander';
import { createInteractiveSession, SessionConfig } from '#src/modules/interactiveSessionModule.js';
import { readCodePrompt } from '#src/prompt.js';

export function codeCommand(program: Command): void {
  program
    .command('code')
    .description(
      'Interactively write code with sloth (has full file system access within your project)'
    )
    .argument('[message]', 'Initial message to start the code session')
    .action(async (message: string) => {
      const sessionConfig: SessionConfig = {
        mode: 'code',
        readModePrompt: readCodePrompt,
        description:
          'Interactively write code with sloth (has full file system access within your project)',
        readyMessage: '\nGaunt Sloth is ready to code. Type your prompt.',
        exitMessage: "Type 'exit' or hit Ctrl+C to exit code session\n",
      };

      await createInteractiveSession(sessionConfig, message);
    });
}
