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

// Initialize commands first
initCommand(program);

// For commands other than 'init', initialize configuration
const commandName = argv[2]; // Get the command name
if (commandName !== 'init') {
  // Initialize configuration
  const config = await initConfig();

  // Initialize commands that need config through prop drilling
  reviewCommand(program, config);
  askCommand(program);
} else {
  // For init command, we don't need config, but still add other commands with minimal config
  // These won't be used during init but are needed for the command structure
  const { getDefaultConfig } = await import('#src/config.js');
  const defaultConfig = getDefaultConfig();
  reviewCommand(program, defaultConfig);
  askCommand(program);
}
// TODO add general interactive chat command

await readStdin(program);
