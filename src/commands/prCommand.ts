import { Command, Option } from 'commander';
import {
  readBackstory,
  readGuidelines,
  readReviewInstructions,
  readSystemPrompt,
} from '#src/prompt.js';
import { readMultipleFilesFromCurrentDir } from '#src/utils.js';
import {
  REQUIREMENTS_PROVIDERS,
  CONTENT_PROVIDERS,
  type RequirementsProviderType,
  getRequirementsFromProvider,
} from './commandUtils.js';

interface PrCommandOptions {
  file?: string[];
  requirementsProvider?: RequirementsProviderType;
}

export function prCommand(program: Command): void {
  program
    .command('pr')
    .description(
      'Review provided Pull Request in current directory. ' +
        'This command is similar to `review`, but default content provider is `github`. ' +
        '(assuming that GitHub CLI is installed and authenticated for current project'
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
      const config = await initConfig(); // Initialize and get config

      const systemPrompt = readSystemPrompt();
      const systemMessage = [
        readBackstory(),
        readGuidelines(config.projectGuidelines),
        readReviewInstructions(config.projectReviewInstructions),
      ];
      if (systemPrompt) {
        systemMessage.push(systemPrompt);
      }
      const content: string[] = [];
      const requirementsProvider =
        options.requirementsProvider ??
        (config?.commands?.pr?.requirementsProvider as RequirementsProviderType | undefined) ??
        (config?.requirementsProvider as RequirementsProviderType | undefined);

      // Handle requirements
      const requirements = await getRequirementsFromProvider(
        requirementsProvider,
        requirementsId,
        config
      );
      if (requirements) {
        content.push(requirements);
      }

      if (options.file) {
        content.push(readMultipleFilesFromCurrentDir(options.file));
      }

      // Get PR diff using the 'github' provider
      const providerPath = `#src/providers/${CONTENT_PROVIDERS['github']}`;
      const { get } = await import(providerPath);
      content.push(await get(null, prId));

      const { review } = await import('#src/modules/reviewModule.js');
      // TODO consider including requirements id
      // TODO sanitize prId
      await review(`PR-${prId}`, systemMessage.join('\n'), content.join('\n'), config, 'pr');
    });
}
