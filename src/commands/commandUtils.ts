import type { SlothConfig } from '#src/config.js';
import { displayError } from '#src/consoleUtils.js';

/**
 * Requirements providers. Expected to be in `.providers/` dir.
 * Aliases are mapped to actual providers in this file
 */
export const REQUIREMENTS_PROVIDERS = {
  'jira-legacy': 'jiraIssueLegacyProvider.js',
  jira: 'jiraIssueProvider.js',
  github: 'ghIssueProvider.js',
  text: 'text.js',
  file: 'file.js',
} as const;

export type RequirementsProviderType = keyof typeof REQUIREMENTS_PROVIDERS;

/**
 * Content providers. Expected to be in `.providers/` dir.
 * Aliases are mapped to actual providers in this file
 */
export const CONTENT_PROVIDERS = {
  github: 'ghPrDiffProvider.js',
  text: 'text.js',
  file: 'file.js',
} as const;

export type ContentProviderType = keyof typeof CONTENT_PROVIDERS;

export async function getRequirementsFromProvider(
  requirementsProvider: RequirementsProviderType | undefined,
  requirementsId: string | undefined,
  config: SlothConfig
): Promise<string> {
  return getFromProvider(
    requirementsProvider,
    requirementsId,
    (config?.requirementsProviderConfig ?? {})[requirementsProvider as string],
    REQUIREMENTS_PROVIDERS
  );
}

export async function getContentFromProvider(
  contentProvider: ContentProviderType | undefined,
  contentId: string | undefined,
  config: SlothConfig
): Promise<string> {
  return getFromProvider(
    contentProvider,
    contentId,
    (config?.contentProviderConfig ?? {})[contentProvider as string],
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
