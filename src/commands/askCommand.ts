import { Command } from 'commander';
import { readBackstory, readGuidelines } from '#src/prompt.js';
import { readMultipleFilesFromCurrentDir } from '#src/utils.js';
import { initConfig, slothContext } from '#src/config.js';

interface AskCommandOptions {
  file?: string[];
}

/**
 * Adds the ask command to the program
 * @param program - The commander program
 */
export function askCommand(program: Command): void {
  program
    .command('ask')
    .description('Ask a question')
    .argument('<message>', 'A message')
    .option(
      '-f, --file [files...]',
      'Input files. Content of these files will be added BEFORE the message'
    )
    // TODO add option consuming extra message as argument
    .action(async (message: string, options: AskCommandOptions) => {
      const preamble = [readBackstory(), readGuidelines(slothContext.config.projectGuidelines)];
      const content = [message];
      if (options.file) {
        content.push(readMultipleFilesFromCurrentDir(options.file));
      }
      await initConfig();
      const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');
      // TODO make the prefix configurable
      await askQuestion('gth-ASK', preamble.join('\n'), content.join('\n'));
    });
}
