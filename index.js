#!/usr/bin/env node
import {Argument, Command} from 'commander';
import {dirname} from 'node:path';
import {displayError, displayInfo} from "./src/consoleUtils.js";
import {
    availableDefaultConfigs,
    createProjectConfig,
    slothContext,
    USER_PROJECT_REVIEW_PREAMBLE
} from "./src/config.js";
import {fileURLToPath} from "url";
import {getSlothVersion, readFileFromCurrentDir, readStdin} from "./src/utils.js";
import {getPrDiff, readInternalPreamble, readPreamble} from "./src/prompt.js";
import {reviewRouter} from "./src/reviewRouter.js";

const program = new Command();

slothContext.currentDir = process.cwd();
slothContext.installDir = dirname(fileURLToPath(import.meta.url))

program
    .name('gsloth')
    .description('Gaunt Sloth Assistant reviewing your PRs')
    .version(getSlothVersion());

program.command('init')
    .description('Initialize the Gaunt Sloth Assistant in your project. This will write necessary config files.')
    .addArgument(new Argument('<type>', 'Config type').choices(availableDefaultConfigs))
    .action(async (config) => {
        await createProjectConfig(config);
    });

// program.command('pr')
//     .description('Review a PR in current git directory (assuming that GH cli is installed and authenticated for current project')
//     .argument('<prNumber>', 'PR number to review')
//     .option('-f, --file <file>', 'Input file. Context of this file will be added BEFORE the diff')
//     // TODO add option consuming extra message as argument
//     .action(async (pr, options) => {
//         if (slothContext.stdin) {
//             displayError('`gsloth pr` does not expect stdin, use `gsloth review` instead');
//             return;
//         }
//         displayInfo(`Starting review of PR ${pr}`);
//         const diff = await getPrDiff(pr);
//         const preamble = [readInternalPreamble(), readPreamble(USER_PROJECT_REVIEW_PREAMBLE)];
//         const content = [diff];
//         if (options.file) {
//             content.push(readFileFromCurrentDir(options.file));
//         }
//         const { review } = await import('./src/codeReview.js');
//         await review('sloth-PR-review-'+pr, preamble.join("\n"), content.join("\n"));
//     });

// program.command('review')
//     .description('Review provided diff (as stdin) or other content. For example `git diff --no-pager | gsloth review`')
//     .option('-f, --file <file>', 'Input file. Context of this file will be added BEFORE the diff')
//     // TODO add option consuming extra message as argument
//     .action(async (options) => {
//         if (!slothContext.stdin && !options.file) {
//             displayError('gsloth review expects stdin with github diff stdin or a file');
//             return
//         }
//         const preamble = [readInternalPreamble(), readPreamble(USER_PROJECT_REVIEW_PREAMBLE)];
//         const content = [];
//         if (slothContext.stdin) {
//             content.push(slothContext.stdin);
//         }
//         if (options.file) {
//             content.push(readFileFromCurrentDir(options.file));
//         }
//         const { review } = await import('./src/codeReview.js');
//         await review('sloth-DIFF-review', preamble.join("\n"), content.join("\n"));
//     });

reviewRouter(program, slothContext)

program.command('ask')
    .description('Ask a question')
    .argument('<message>', 'A message')
    .option('-f, --file <file>', 'Input file. Content of this file will be added BEFORE the diff')
    // TODO add option consuming extra message as argument
    .action(async (message, options) => {
        const preamble = [readInternalPreamble()];
        const content = [message];
        if (options.file) {
            content.push(readFileFromCurrentDir(options.file));
        }
        const { askQuestion } = await import('./src/questionAnswering.js');
        await askQuestion('sloth-ASK', preamble.join("\n"), content.join("\n"));
    });

// TODO add general interactive chat command

await readStdin(program);
