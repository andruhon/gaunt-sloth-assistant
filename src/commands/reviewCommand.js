import { Option } from 'commander';
import { USER_PROJECT_REVIEW_PREAMBLE } from "../config.js";
import { readInternalPreamble, readPreamble } from "../prompt.js";
import { readFileFromCurrentDir } from "../utils.js";
import { displayError } from "../consoleUtils.js";

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

            if (typeof context.config?.requirementsProvider === 'function') {
                content.push(await context.config.requirementsProvider(context.config?.requirementsProviderConfig, requirementsId));
            } else if (typeof context.config?.requirementsProvider === 'string') {
                // Use one of the predefined requirements providers
                const providerName = context.config.requirementsProvider;
                if (REQUIREMENTS_PROVIDERS[providerName]) {
                    const providerPath = `../providers/${REQUIREMENTS_PROVIDERS[providerName]}`;
                    const { get } = await import(providerPath);
                    content.push(await get(context.config?.requirementsProviderConfig, requirementsId));
                } else {
                    displayError(`Unknown requirements provider: ${providerName}`);
                }
            }
            if (typeof context.config?.contentProvider === 'function') {
                content.push(await context.config.contentProvider(context.config?.contentProviderConfig, contentId));
            } else if (typeof context.config?.contentProvider === 'string') {
                // Use one of the predefined content providers
                const providerName = context.config.contentProvider;
                if (CONTENT_PROVIDERS[providerName]) {
                    const providerPath = `../providers/${CONTENT_PROVIDERS[providerName]}`;
                    const { get } = await import(providerPath);
                    content.push(await get(contentId));
                } else {
                    displayError(`Unknown content provider: ${providerName}`);
                }
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
            'This command is similar to `review`, but default content provider is `gh`. ' +
            '(assuming that GH cli is installed and authenticated for current project')
        .argument('<prId>', 'Pull request ID to review.')
        .argument('[requirementsId]', 'Optional requirements ID argument to retrieve requirements with requirements provider')
        .addOption(
            new Option('-p, --requirements-provider <requirementsProvider>', 'Requirements provider for this review.')
            .choices(Object.keys(REQUIREMENTS_PROVIDERS))
        )
        .action(async (prId, requirementsId, options) => {
            const { initConfig } = await import("../config.js");
            await initConfig();

            const preamble = [readInternalPreamble(), readPreamble(USER_PROJECT_REVIEW_PREAMBLE)];
            const content = [];

            // Handle requirements
            if (typeof context.config?.requirementsProvider === 'function') {
                content.push(await context.config.requirementsProvider(context.config?.requirementsProviderConfig, requirementsId));
            } else if (typeof context.config?.requirementsProvider === 'string') {
                const providerName = context.config.requirementsProvider;
                if (REQUIREMENTS_PROVIDERS[providerName]) {
                    const providerPath = `../providers/${REQUIREMENTS_PROVIDERS[providerName]}`;
                    const { get } = await import(providerPath);
                    content.push(await get(context.config?.requirementsProviderConfig, requirementsId));
                } else {
                    displayError(`Unknown requirements provider: ${providerName}`);
                }
            }

            // TODO this should still be possible to override default content provider in config.
            // TODO Should there be a separate option to override PR content provider specifically?

            // Get PR diff using the 'gh' provider
            const providerPath = `../providers/${CONTENT_PROVIDERS['gh']}`;
            const { get } = await import(providerPath);
            content.push(await get(prId));

            const { review } = await import('../modules/reviewModule.js');
            await review(`sloth-PR-${prId}-review`, preamble.join("\n"), content.join("\n"));
        });
}
