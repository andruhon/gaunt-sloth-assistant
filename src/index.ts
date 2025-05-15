import { Command } from 'commander';
import { askCommand } from '#src/commands/askCommand.js';
import { initCommand } from '#src/commands/initCommand.js';
import { reviewCommand } from '#src/commands/reviewCommand.js';
import { slothContext } from '#src/config.js';
import { getSlothVersion, readStdin } from '#src/utils.js';

const program = new Command();

program
  .name('gsloth')
  .description('Gaunt Sloth Assistant reviewing your PRs')
  .version(getSlothVersion());

initCommand(program);
reviewCommand(program, slothContext);
askCommand(program);

// TODO add general interactive chat command

await readStdin(program);
