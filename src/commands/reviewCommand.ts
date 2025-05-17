import { Command, Option } from 'commander';
import type { SlothContext } from '#src/config.js';
import { slothContext } from '#src/config.js';
import { readBackstory, readGuidelines, readReviewInstructions } from '#src/prompt.js';
import { readMultipleFilesFromCurrentDir } from '#src/utils.js';
import { displayError } from '#src/consoleUtils.js';
import { getStringFromStdin } from '#src/systemUtils.js';

/**
 * Requirements providers. Expected to be in `.providers/` dir
 */
const REQUIREMENTS_PROVIDERS = {
  'jira-legacy': 'jiraIssueLegacyProvider.js',
  jira: 'jiraIssueProvider.js',
  text: 'text.js',
  file: 'file.js',
} as const;

type RequirementsProviderType = keyof typeof REQUIREMENTS_PROVIDERS;

/**
 * Content providers. Expected to be in `.providers/` dir
 */
const CONTENT_PROVIDERS = {
  gh: 'ghPrDiffProvider.js',
  text: 'text.js',
  file: 'file.js',
} as const;

type ContentProviderType = keyof typeof CONTENT_PROVIDERS;

interface ReviewCommandOptions {
  file?: string[];
  requirements?: string;
  requirementsProvider?: RequirementsProviderType;
  contentProvider?: ContentProviderType;
  message?: string;
}

interface PrCommandOptions {
  file?: string[];
  requirementsProvider?: RequirementsProviderType;
}

export function reviewCommand(program: Command, context: SlothContext): void {
  program
    .command('review')
    .description('Review provided diff or other content')
    .argument(
      '[contentId]',
      'Optional content ID argument to retrieve content with content provider'
    )
    .alias('r')
    // TODO add provider to get results of git --no-pager diff
    .option(
      '-f, --file [files...]',
      'Input files. Content of these files will be added BEFORE the diff, but after requirements'
    )
    // TODO figure out what to do with this (we probably want to merge it with requirementsId)?
    .option('-r, --requirements <requirements>', 'Requirements for this review.')
    .addOption(
      new Option(
        '-p, --requirements-provider <requirementsProvider>',
        'Requirements provider for this review.'
      ).choices(Object.keys(REQUIREMENTS_PROVIDERS))
    )
    .addOption(
      new Option('--content-provider <contentProvider>', 'Content  provider').choices(
        Object.keys(CONTENT_PROVIDERS)
      )
    )
    .option('-m, --message <message>', 'Extra message to provide just before the content')
    .action(async (contentId: string | undefined, options: ReviewCommandOptions) => {
      const { initConfig } = await import('#src/config.js');
      await initConfig();
      const systemMessage = [
        readBackstory(),
        readGuidelines(slothContext.config.projectGuidelines),
        readReviewInstructions(slothContext.config.projectReviewInstructions),
      ];
      const content: string[] = [];
      const requirementsId = options.requirements;
      const requirementsProvider =
        options.requirementsProvider ??
        (context.config?.review?.requirementsProvider as RequirementsProviderType | undefined) ??
        (context.config?.requirementsProvider as RequirementsProviderType | undefined);
      const contentProvider =
        options.contentProvider ??
        (context.config?.review?.contentProvider as ContentProviderType | undefined) ??
        (context.config?.contentProvider as ContentProviderType | undefined);

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
      let stringFromStdin = getStringFromStdin();
      if (stringFromStdin) {
        content.push(stringFromStdin);
      }
      if (options.message) {
        content.push(options.message);
      }
      const { review } = await import('#src/modules/reviewModule.js');
      await review('REVIEW', systemMessage.join('\n'), content.join('\n'));
    });

  program
    .command('pr')
    .description(
      'Review provided Pull Request in current directory. ' +
        'This command is similar to `review`, but default content provider is `gh`. ' +
        '(assuming that GH cli is installed and authenticated for current project'
    )
    .argument('<prId>', 'Pull request ID to review.')
    .argument(
      '[requirementsId]',
      'Optional requirements ID argument to retrieve requirements with requirements provider'
    )
    .addOption(
      new Option(
        '-p, --requirements-provider <requirementsProvider>',
        'Requirements provider for this review.'
      ).choices(Object.keys(REQUIREMENTS_PROVIDERS))
    )
    .option(
      '-f, --file [files...]',
      'Input files. Content of these files will be added BEFORE the diff, but after requirements'
    )
    .action(async (prId: string, requirementsId: string | undefined, options: PrCommandOptions) => {
      const { initConfig } = await import('#src/config.js');
      await initConfig();

      const systemMessage = [
        readBackstory(),
        readGuidelines(slothContext.config.projectGuidelines),
        readReviewInstructions(slothContext.config.projectReviewInstructions),
      ];
      const content: string[] = [];
      const requirementsProvider =
        options.requirementsProvider ??
        (context.config?.pr?.requirementsProvider as RequirementsProviderType | undefined) ??
        (context.config?.requirementsProvider as RequirementsProviderType | undefined);

      // Handle requirements
      const requirements = await getRequirementsFromProvider(requirementsProvider, requirementsId);
      if (requirements) {
        content.push(requirements);
      }

      if (options.file) {
        content.push(readMultipleFilesFromCurrentDir(options.file));
      }

      // Get PR diff using the 'gh' provider
      const providerPath = `#src/providers/${CONTENT_PROVIDERS['gh']}`;
      const { get } = await import(providerPath);
      content.push(await get(null, prId));

      const { review } = await import('#src/modules/reviewModule.js');
      // TODO consider including requirements id
      // TODO sanitize prId
      await review(`PR-${prId}`, systemMessage.join('\n'), content.join('\n'));
    });

  async function getRequirementsFromProvider(
    requirementsProvider: RequirementsProviderType | undefined,
    requirementsId: string | undefined
  ): Promise<string> {
    return getFromProvider(
      requirementsProvider,
      requirementsId,
      (context.config?.requirementsProviderConfig ?? {})[requirementsProvider as string],
      REQUIREMENTS_PROVIDERS
    );
  }

  async function getContentFromProvider(
    contentProvider: ContentProviderType | undefined,
    contentId: string | undefined
  ): Promise<string> {
    return getFromProvider(
      contentProvider,
      contentId,
      (context.config?.contentProviderConfig ?? {})[contentProvider as string],
      CONTENT_PROVIDERS
    );
  }

  async function getFromProvider(
    provider: RequirementsProviderType | ContentProviderType | undefined,
    id: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any,
    legitPredefinedProviders: typeof REQUIREMENTS_PROVIDERS | typeof CONTENT_PROVIDERS
  ): Promise<string> {
    if (typeof provider === 'string') {
      // Use one of the predefined providers
      if (legitPredefinedProviders[provider as keyof typeof legitPredefinedProviders]) {
        const providerPath = `#src/providers/${legitPredefinedProviders[provider as keyof typeof legitPredefinedProviders]}`;
        const { get } = await import(providerPath);
        return await get(config, id);
      } else {
        displayError(`Unknown provider: ${provider}. Continuing without it.`);
      }
    } else if (typeof provider === 'function') {
      // Type assertion to handle function call
      return await (provider as (id: string | undefined) => Promise<string>)(id);
    }
    return '';
  }
}
