import { Command } from 'commander';
import { readBackstory, readGuidelines } from '#src/prompt.js';
import { readMultipleFilesFromCurrentDir } from '#src/utils.js';
import { initConfig, slothContext } from '#src/config.js';
import { getStringFromStdin } from '#src/systemUtils.js';

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
    .argument('[message]', 'A message')
    .option(
      '-f, --file [files...]',
      'Input files. Content of these files will be added BEFORE the message'
    )
    .action(async (message: string, options: AskCommandOptions) => {
      await initConfig();
      const preamble = [readBackstory(), readGuidelines(slothContext.config.projectGuidelines)];
      const content = [];
      if (options.file) {
        content.push(readMultipleFilesFromCurrentDir(options.file));
      }
      let stringFromStdin = getStringFromStdin();
      if (stringFromStdin) {
        content.push(stringFromStdin);
      }
      if (message) {
        content.push(message);
      }

      // Validate that at least one input source is provided
      if (content.length === 0) {
        throw new Error('At least one of the following is required: file, stdin, or message');
      }

      const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');
      await askQuestion('ASK', preamble.join('\n'), content.join('\n'));
    });
}
