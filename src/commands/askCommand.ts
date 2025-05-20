import { Command } from 'commander';
import { readBackstory, readGuidelines } from '#src/prompt.js';
import { readMultipleFilesFromCurrentDir } from '#src/utils.js';
import { initConfig } from '#src/config.js';
import { ConfigManager } from '#src/managers/configManager.js';

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
      await initConfig();

      // Get the config from ConfigManager
      const configManager = ConfigManager.getInstance();
      const projectGuidelines = configManager.config.projectGuidelines;

      const preamble = [readBackstory(), readGuidelines(projectGuidelines)];
      const content = [message];
      if (options.file) {
        content.push(readMultipleFilesFromCurrentDir(options.file));
      }
      const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');
      await askQuestion('ASK', preamble.join('\n'), content.join('\n'));
    });
}
