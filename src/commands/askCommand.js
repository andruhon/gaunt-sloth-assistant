import { readInternalPreamble } from "../prompt.js";
import { readMultipleFilesFromCurrentDir } from "../utils.js";
import { initConfig } from "../config.js";

/**
 * Adds the ask command to the program
 * @param {Object} program - The commander program
 * @param {Object} context - The context object
 */
export function askCommand(program, context) {
    program.command('ask')
        .description('Ask a question')
        .argument('<message>', 'A message')
        .option('-f, --file [files...]', 'Input files. Content of these files will be added BEFORE the message')
        // TODO add option consuming extra message as argument
        .action(async (message, options) => {
            const preamble = [readInternalPreamble()];
            const content = [message];
            if (options.file) {
                content.push(readMultipleFilesFromCurrentDir(options.file));
            }
            await initConfig();
            const { askQuestion } = await import('../modules/questionAnsweringModule.js');
            await askQuestion('sloth-ASK', preamble.join("\n"), content.join("\n"));
        });
}