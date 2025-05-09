import { Option } from 'commander';
import { USER_PROJECT_REVIEW_PREAMBLE } from "../config.js";
import { readInternalPreamble, readPreamble } from "../prompt.js";
import { readMultipleFilesFromCurrentDir } from "../utils.js";
import { displayError } from "../consoleUtils.js";
/**
 * Requirements providers. Expected to be in `.providers/` dir
 */
const REQUIREMENTS_PROVIDERS = {
    'jira-legacy': 'jiraIssueLegacyAccessTokenProvider.js',
    'text': 'text.js',
    'file': 'file.js'
};
/**
 * Content providers. Expected to be in `.providers/` dir
 */
const CONTENT_PROVIDERS = {
    'gh': 'ghPrDiffProvider.js',
    'text': 'text.js',
    'file': 'file.js'
};
export function reviewCommand(program, context) {
    program.command('review')
        .description('Review provided diff or other content')
        .argument('[contentId]', 'Optional content ID argument to retrieve content with content provider')
        .alias('r')
        // TODO add provider to get results of git --no-pager diff
        .option('-f, --file [files...]', 'Input files. Content of these files will be added BEFORE the diff, but after requirements')
        // TODO figure out what to do with this (we probably want to merge it with requirementsId)?
        .option('-r, --requirements <requirements>', 'Requirements for this review.')
        .addOption(new Option('-p, --requirements-provider <requirementsProvider>', 'Requirements provider for this review.')
        .choices(Object.keys(REQUIREMENTS_PROVIDERS)))
        .addOption(new Option('--content-provider <contentProvider>', 'Content  provider')
        .choices(Object.keys(CONTENT_PROVIDERS)))
        .option('-m, --message <message>', 'Extra message to provide just before the content')
        .action(async (contentId, options) => {
        const { initConfig } = await import("../config.js");
        await initConfig();
        const preamble = [readInternalPreamble(), readPreamble(USER_PROJECT_REVIEW_PREAMBLE)];
        const content = [];
        const requirementsId = options.requirements;
        const requirementsProvider = options.requirementsProvider
            ?? context.config?.review?.requirementsProvider
            ?? context.config?.requirementsProvider;
        const contentProvider = options.contentProvider
            ?? context.config?.review?.contentProvider
            ?? context.config?.contentProvider;
        // TODO consider calling these in parallel
        const requirements = await getRequirementsFromProvider(requirementsProvider, requirementsId);
        if (requirements) {
            content.push(requirements);
        }
        const providedContent = await getContentFromProvider(contentProvider, contentId);
        if (providedContent) {
            content.push(providedContent);
        }
        if (options.file) {
            content.push(readMultipleFilesFromCurrentDir(options.file));
        }
        if (context.stdin) {
            content.push(context.stdin);
        }
        if (options.message) {
            content.push(options.message);
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
        .addOption(new Option('-p, --requirements-provider <requirementsProvider>', 'Requirements provider for this review.')
        .choices(Object.keys(REQUIREMENTS_PROVIDERS)))
        .option('-f, --file [files...]', 'Input files. Content of these files will be added BEFORE the diff, but after requirements')
        .action(async (prId, requirementsId, options) => {
        const { initConfig } = await import("../config.js");
        await initConfig();
        const preamble = [readInternalPreamble(), readPreamble(USER_PROJECT_REVIEW_PREAMBLE)];
        const content = [];
        const requirementsProvider = options.requirementsProvider
            ?? context.config?.pr?.requirementsProvider
            ?? context.config?.requirementsProvider;
        // Handle requirements
        const requirements = await getRequirementsFromProvider(requirementsProvider, requirementsId);
        if (requirements) {
            content.push(requirements);
        }
        if (options.file) {
            content.push(readMultipleFilesFromCurrentDir(options.file));
        }
        // Get PR diff using the 'gh' provider
        const providerPath = `../providers/${CONTENT_PROVIDERS['gh']}`;
        const { get } = await import(providerPath);
        content.push(await get(null, prId));
        const { review } = await import('../modules/reviewModule.js');
        await review(`sloth-PR-${prId}-review`, preamble.join("\n"), content.join("\n"));
    });
    async function getRequirementsFromProvider(requirementsProvider, requirementsId) {
        return getFromProvider(requirementsProvider, requirementsId, (context.config?.requirementsProviderConfig ?? {})[requirementsProvider], REQUIREMENTS_PROVIDERS);
    }
    async function getContentFromProvider(contentProvider, contentId) {
        return getFromProvider(contentProvider, contentId, (context.config?.contentProviderConfig ?? {})[contentProvider], CONTENT_PROVIDERS);
    }
    async function getFromProvider(provider, id, config, legitPredefinedProviders) {
        if (typeof provider === 'string') {
            // Use one of the predefined providers
            if (legitPredefinedProviders[provider]) {
                const providerPath = `../providers/${legitPredefinedProviders[provider]}`;
                const { get } = await import(providerPath);
                return await get(config, id);
            }
            else {
                displayError(`Unknown provider: ${provider}. Continuing without it.`);
            }
        }
        else if (typeof provider === 'function') {
            return await provider(id);
        }
        return '';
    }
}
//# sourceMappingURL=reviewCommand.js.map