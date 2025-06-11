import { Command } from 'commander';
import { askCommand } from '#src/commands/askCommand.js';
import { codeCommand } from '#src/commands/codeCommand.js';
import { initCommand } from '#src/commands/initCommand.js';
import { reviewCommand } from '#src/commands/reviewCommand.js';
import { prCommand } from '#src/commands/prCommand.js';
import { getSlothVersion } from '#src/utils.js';
import { argv, readStdin } from '#src/systemUtils.js';
import { setVerbose } from '#src/llmUtils.js';

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
codeCommand(program);
// TODO add general interactive chat command

await readStdin(program);
