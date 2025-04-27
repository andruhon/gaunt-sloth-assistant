import { Option } from 'commander';
import { USER_PROJECT_REVIEW_PREAMBLE } from "../config.js";
import { readInternalPreamble, readPreamble } from "../prompt.js";
import { readFileFromCurrentDir } from "../utils.js";

/**
 * Requirements providers. Expected to be in `.providers/` dir
 */
const REQUIREMENTS_PROVIDERS = {
    'jira-legacy': 'jiraIssueLegacyAccessTokenProvider.js'
};

/**
 * Content providers. Expected to be in `.providers/` dir
 */
const CONTENT_PROVIDERS = {
    'gh': 'ghPrDiffProvider.js'
};

export async function reviewCommand(program, context) {
    program.command('review')
        .description('Review provided diff or other content')
        .argument('[contentId]', 'Optional content ID argument to retrieve content with content provider')
        .argument('[requirementsId]', 'Optional requirements ID argument to retrieve requirements with requirements provider')
        .alias('r')
        // TODO add provider to get results of git --no-pager diff
        // TODO add support to include multiple files
        .option('-f, --file <file>', 'Input file. Content of this file will be added BEFORE the diff, but after requirements')
        .option('-r, --requirements <requirements>', 'Requirements for this review.')
        .addOption(
            new Option('-p, --requirements-provider <requirementsProvider>', 'Requirements provider for this review.')
            .choices(Object.keys(REQUIREMENTS_PROVIDERS))
        )
        .option('-c, --content <content>', 'Content (usually code) to review')
        .addOption(
            new Option('--content-provider <contentProvider>', 'Content  provider')
            .choices(Object.keys(CONTENT_PROVIDERS))
        )
        .option('-m, --message <message>', 'Extra message to provide just before the content')
        .action(async (contentId, requirementsId, options) => {
            // if (!context.stdin || options.file) {
            //     displayError('gsloth review expects stdin with github diff stdin or a file');
            //     return
            // }
            const { initConfig } = await import("../config.js");
            await initConfig();
            const preamble = [readInternalPreamble(), readPreamble(USER_PROJECT_REVIEW_PREAMBLE)];
            const content = [];
            // TODO add implementations for command provider override
            if (typeof context.config?.requirementsProvider === 'function') {
                content.push(await context.config.requirementsProvider(context.config?.requirementsProviderConfig, requirementsId));
            } else if (typeof context.config?.requirementsProvider === 'string') {
                // TODO Use one of predefined requirements providers
            }
            if (typeof context.config?.contentProvider === 'function') {
                content.push(await context.config.contentProvider(context.config?.contentProviderConfig, contentId));
            } else if (typeof context.config?.contentProvider === 'string') {
                // TODO Use one of predefined requirements providers
            }
            if (options.file) {
                content.push(readFileFromCurrentDir(options.file));
            }
            if (context.stdin) {
                content.push(context.stdin);
            }
            const { review } = await import('../modules/reviewModule.js');
            await review('sloth-DIFF-review', preamble.join("\n"), content.join("\n"));
        });

    program.command('pr')
        .description('Review provided Pull Request in current directory. ' +
            'This command is similar to `review`, but default requirements provider is `ghPrDiff`. ' +
            '(assuming that GH cli is installed and authenticated for current project')
        .argument('<prId>', 'Pull request ID to review.')
        .argument('[requirementsId]', 'Optional requirements ID argument to retrieve requirements with requirements provider')
        .action(async (options) => {

        });
}