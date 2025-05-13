import { Command } from 'commander';
import { readInternalPreamble } from "#src/prompt.js";
import { readMultipleFilesFromCurrentDir } from "#src/utils.js";
import { initConfig } from "#src/config.js";
import type { SlothContext } from "#src/config.js";

interface AskCommandOptions {
    file?: string[];
}

/**
 * Adds the ask command to the program
 * @param program - The commander program
 * @param context - The context object
 */
export function askCommand(program: Command, context: SlothContext): void {
    program.command('ask')
        .description('Ask a question')
        .argument('<message>', 'A message')
        .option('-f, --file [files...]', 'Input files. Content of these files will be added BEFORE the message')
        // TODO add option consuming extra message as argument
        .action(async (message: string, options: AskCommandOptions) => {
            const preamble = [readInternalPreamble()];
            const content = [message];
            if (options.file) {
                content.push(readMultipleFilesFromCurrentDir(options.file));
            }
            await initConfig();
            const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');
            await askQuestion('sloth-ASK', preamble.join("\n"), content.join("\n"));
        });
} 