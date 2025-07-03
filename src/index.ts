import { Command } from 'commander';
import { askCommand } from '#src/commands/askCommand.js';
import { initCommand } from '#src/commands/initCommand.js';
import { reviewCommand } from '#src/commands/reviewCommand.js';
import { prCommand } from '#src/commands/prCommand.js';
import { chatCommand } from '#src/commands/chatCommand.js';
import { codeCommand } from '#src/commands/codeCommand.js';
import { getSlothVersion } from '#src/utils.js';
import { argv, readStdin } from '#src/systemUtils.js';
import { setVerbose } from '#src/llmUtils.js';
import { createInteractiveSession, SessionConfig } from '#src/modules/interactiveSessionModule.js';
import { readChatPrompt } from '#src/prompt.js';

const program = new Command();

program
  .name('gsloth')
  .description('Gaunt Sloth Assistant reviewing your PRs')
  .version(getSlothVersion())
  .option('--verbose', 'Print entire prompt sent to LLM.');

// Parse global options before binding any commands
program.parseOptions(argv);
if (program.getOptionValue('verbose')) {
  // Set global prompt debug
  setVerbose(true);
}

// Initialize all commands - they will handle their own config loading
initCommand(program);
reviewCommand(program);
prCommand(program);
askCommand(program);
chatCommand(program);
codeCommand(program);

// Add action for when no subcommand is provided - start chat session
program.action(async () => {
  const sessionConfig: SessionConfig = {
    mode: 'chat',
    readModePrompt: readChatPrompt,
    description: 'Start an interactive chat session with Gaunt Sloth',
    readyMessage: '\nGaunt Sloth is ready to chat. Type your prompt.',
    exitMessage: "Type 'exit' or hit Ctrl+C to exit chat\n",
  };

  await createInteractiveSession(sessionConfig);
});

await readStdin(program);
