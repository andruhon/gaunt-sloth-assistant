import { Command } from 'commander';
import { askCommand } from '#src/commands/askCommand.js';
import { initCommand } from '#src/commands/initCommand.js';
import { reviewCommand } from '#src/commands/reviewCommand.js';
import { initConfig } from '#src/config.js';
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

// Initialize configuration
const config = await initConfig();

// Initialize commands with config object through prop drilling
initCommand(program);
reviewCommand(program, config);
askCommand(program);
// TODO add general interactive chat command

await readStdin(program);
