import { Command } from 'commander';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';
import { readMultipleFilesFromCurrentDir } from '#src/utils.js';
import { initConfig } from '#src/config.js';
import { getStringFromStdin } from '#src/systemUtils.js';

interface CodeCommandOptions {
  file?: string[];
}

/**
 * Adds the code command to the program
 * @param program - The commander program
 */
export function codeCommand(program: Command): void {
  program
    .command('code')
    .description('Ask Sloth to write some code (has full file system access within your project)')
    .argument('[message]', 'A message')
    .option(
      '-f, --file [files...]',
      'Input files. Content of these files will be added BEFORE the message'
    )
    .action(async (message: string, options: CodeCommandOptions) => {
      const config = await initConfig();
      const systemPrompt = readSystemPrompt();
      const preamble = [readBackstory(), readGuidelines(config.projectGuidelines)];
      if (systemPrompt) {
        preamble.push(systemPrompt);
      }
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

      const { processRequest } = await import('#src/modules/requestProcessor.js');
      await processRequest('CODE', preamble.join('\n'), content.join('\n'), config, 'code');
    });
}
