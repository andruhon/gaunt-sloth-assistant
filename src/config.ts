import path from 'node:path/posix';
import { v4 as uuidv4 } from 'uuid';
import { displayDebug, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { importExternalFile, writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { existsSync, readFileSync } from 'node:fs';
import { error, exit, getCurrentDir } from '#src/systemUtils.js';
import { LanguageModelLike } from '@langchain/core/language_models/base';

export interface SlothConfig extends BaseSlothConfig {
  llm: LanguageModelLike; // FIXME this is still bad keeping instance in config is probably not best choice
  contentProvider: string;
  requirementsProvider: string;
  commands: {
    pr: {
      contentProvider: string;
    };
  };
}

/**
 * Raw, unprocessed sloth config
 */
export interface RawSlothConfig extends BaseSlothConfig {
  llm: LLMConfig;
}

/**
 * Do not export this one
 */
interface BaseSlothConfig {
  llm: unknown;
  contentProvider?: string;
  requirementsProvider?: string;
  commands?: {
    pr: {
      contentProvider: string;
    };
  };
  review?: {
    requirementsProvider?: string;
    contentProvider?: string;
  };
  pr?: {
    requirementsProvider?: string;
  };
  requirementsProviderConfig?: Record<string, unknown>;
  contentProviderConfig?: Record<string, unknown>;
}

/**
 * @deprecated
 * this object has blurred responsibility lines and bad name.
 */
export interface SlothContext {
  config: SlothConfig;
  stdin: string;
  session: {
    configurable: {
      thread_id: string;
    };
  };
}

export interface LLMConfig extends Record<string, unknown> {
  type: string;
  model: string;
}

export const USER_PROJECT_CONFIG_JS = '.gsloth.config.js';
export const USER_PROJECT_CONFIG_JSON = '.gsloth.config.json';
export const USER_PROJECT_CONFIG_MJS = '.gsloth.config.mjs';
export const GSLOTH_BACKSTORY = '.gsloth.backstory.md';
export const USER_PROJECT_REVIEW_PREAMBLE = '.gsloth.preamble.review.md';

export const availableDefaultConfigs = ['vertexai', 'anthropic', 'groq'] as const;
export type ConfigType = (typeof availableDefaultConfigs)[number];

export const DEFAULT_CONFIG: Partial<SlothConfig> = {
  llm: undefined,
  contentProvider: 'file',
  requirementsProvider: 'file',
  commands: {
    pr: {
      contentProvider: 'gh',
    },
  },
};

/**
 * @deprecated
 * this object has blurred responsibility lines and bad name.
 * TODO this should be reworked to something more robust
 */
export const slothContext = {
  config: DEFAULT_CONFIG,
  stdin: '',
  session: { configurable: { thread_id: uuidv4() } },
} as Partial<SlothContext> as SlothContext;

export async function initConfig(): Promise<void> {
  const currentDir = getCurrentDir();
  const jsonConfigPath = path.join(currentDir, USER_PROJECT_CONFIG_JSON);
  const jsConfigPath = path.join(currentDir, USER_PROJECT_CONFIG_JS);
  const mjsConfigPath = path.join(currentDir, USER_PROJECT_CONFIG_MJS);

  // Try loading JSON config file first
  if (existsSync(jsonConfigPath)) {
    try {
      const jsonConfig = JSON.parse(readFileSync(jsonConfigPath, 'utf8')) as RawSlothConfig;
      // If the config has an LLM with a type, create the appropriate LLM instance
      if (jsonConfig.llm && typeof jsonConfig.llm === 'object' && 'type' in jsonConfig.llm) {
        await tryJsonConfig(jsonConfig);
      } else {
        error(`${jsonConfigPath} is not in valid format. Should at least define llm.type`);
        exit(1);
      }
    } catch (e) {
      displayDebug(e instanceof Error ? e : String(e));
      displayError(
        `Failed to read config from ${USER_PROJECT_CONFIG_JSON}, will try other formats.`
      );
      // Continue to try other formats
      return tryJsConfig();
    }
  } else {
    // JSON config not found, try JS
    return tryJsConfig();
  }

  // Helper function to try loading JS config
  async function tryJsConfig(): Promise<void> {
    if (existsSync(jsConfigPath)) {
      return importExternalFile(jsConfigPath)
        .then((i: { configure: (module: string) => Promise<Partial<SlothConfig>> }) =>
          i.configure(jsConfigPath)
        )
        .then((config) => {
          slothContext.config = { ...slothContext.config, ...config };
        })
        .catch((e) => {
          displayDebug(e instanceof Error ? e : String(e));
          displayError(
            `Failed to read config from ${USER_PROJECT_CONFIG_JS}, will try other formats.`
          );
          // Continue to try other formats
          return tryMjsConfig();
        });
    } else {
      // JS config not found, try MJS
      return tryMjsConfig();
    }
  }

  // Helper function to try loading MJS config
  async function tryMjsConfig(): Promise<void> {
    if (existsSync(mjsConfigPath)) {
      return importExternalFile(mjsConfigPath)
        .then((i: { configure: (module: string) => Promise<Partial<SlothConfig>> }) =>
          i.configure(mjsConfigPath)
        )
        .then((config) => {
          slothContext.config = { ...slothContext.config, ...config };
        })
        .catch((e) => {
          displayDebug(e instanceof Error ? e : String(e));
          displayError(`Failed to read config from ${USER_PROJECT_CONFIG_MJS}.`);
          displayError(`No valid configuration found. Please create a valid configuration file.`);
          exit();
        });
    } else {
      // No config files found
      displayError(
        'No configuration file found. Please create one of: ' +
          `${USER_PROJECT_CONFIG_JSON}, ${USER_PROJECT_CONFIG_JS}, or ${USER_PROJECT_CONFIG_MJS} ` +
          'in your project directory.'
      );
      exit();
    }
  }
}

// Process JSON LLM config by creating the appropriate LLM instance
export async function tryJsonConfig(jsonConfig: RawSlothConfig): Promise<void> {
  const llmConfig = jsonConfig?.llm;
  const llmType = llmConfig?.type?.toLowerCase();

  // Check if the LLM type is in availableDefaultConfigs
  if (!llmType || !availableDefaultConfigs.includes(llmType as ConfigType)) {
    displayError(
      `Unsupported LLM type: ${llmType}. Available types are: ${availableDefaultConfigs.join(', ')}`
    );
    exit(1);
    return;
  }

  try {
    // Import the appropriate config module based on the LLM type
    try {
      const configModule = await import(`./configs/${llmType}.js`);
      if (configModule.processJsonConfig) {
        const llm = (await configModule.processJsonConfig(llmConfig)) as LanguageModelLike;
        slothContext.config = { ...slothContext.config, ...jsonConfig, llm };
      } else {
        displayWarning(`Config module for ${llmType} does not have processJsonConfig function.`);
        exit(1);
      }
    } catch (importError) {
      displayDebug(importError instanceof Error ? importError : String(importError));
      displayWarning(`Could not import config module for ${llmType}.`);
      exit(1);
    }
  } catch (error) {
    displayDebug(error instanceof Error ? error : String(error));
    displayError(`Error creating LLM instance for type ${llmType}.`);
    exit(1);
  }
}

export async function createProjectConfig(configType: string): Promise<void> {
  displayInfo(`Setting up your project\n`);
  writeProjectReviewPreamble();
  displayWarning(
    `Make sure you add as much detail as possible to your ${USER_PROJECT_REVIEW_PREAMBLE}.\n`
  );

  // Check if the config type is in availableDefaultConfigs
  if (!availableDefaultConfigs.includes(configType as ConfigType)) {
    displayError(
      `Unsupported config type: ${configType}. Available types are: ${availableDefaultConfigs.join(', ')}`
    );
    exit(1);
    return;
  }

  displayInfo(`Creating project config for ${configType}`);
  const vendorConfig = await import(`./configs/${configType}.js`);
  vendorConfig.init(USER_PROJECT_CONFIG_JSON, slothContext);
}

export function writeProjectReviewPreamble(): void {
  const currentDir = getCurrentDir();
  const reviewPreamblePath = path.join(currentDir, USER_PROJECT_REVIEW_PREAMBLE);
  writeFileIfNotExistsWithMessages(
    reviewPreamblePath,
    'You are doing generic code review.\n' +
      ' Important! Please remind user to prepare proper AI preamble in' +
      USER_PROJECT_REVIEW_PREAMBLE +
      ' for this project. Use decent amount of ⚠️ to highlight lack of config.' +
      ' Explicitly mention `' +
      USER_PROJECT_REVIEW_PREAMBLE +
      '`.'
  );
}

/**
 * @deprecated test only
 * TODO should be gone together with slothContext itself
 */
export function reset() {
  Object.keys(slothContext).forEach((key) => {
    delete (slothContext as unknown as Record<string, unknown>)[key];
  });
  slothContext.config = DEFAULT_CONFIG as SlothConfig;
  slothContext.stdin = '';
  slothContext.session = { configurable: { thread_id: uuidv4() } };
}
