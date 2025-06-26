import { displayDebug, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { importExternalFile, writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { existsSync, readFileSync } from 'node:fs';
import { error, exit } from '#src/systemUtils.js';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getGslothConfigReadPath, getGslothConfigWritePath } from '#src/filePathUtils.js';
import type { Connection } from '@langchain/mcp-adapters';
import type { StructuredToolInterface } from '@langchain/core/tools';
import {
  USER_PROJECT_CONFIG_JS,
  USER_PROJECT_CONFIG_JSON,
  USER_PROJECT_CONFIG_MJS,
  PROJECT_GUIDELINES,
  PROJECT_REVIEW_INSTRUCTIONS,
} from '#src/constants.js';

export interface SlothConfig extends BaseSlothConfig {
  llm: BaseChatModel; // FIXME this is still bad keeping instance in config is probably not best choice
  contentProvider: string;
  requirementsProvider: string;
  projectGuidelines: string;
  projectReviewInstructions: string;
  streamOutput: boolean;
  filesystem: string[] | 'all' | 'none';
  tools?: StructuredToolInterface[];
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
  projectGuidelines?: string;
  projectReviewInstructions?: string;
  streamOutput?: boolean;
  filesystem?: string[] | 'all' | 'none';
  commands?: {
    pr?: {
      contentProvider?: string;
      requirementsProvider?: string;
      filesystem?: string[] | 'all' | 'none';
    };
    review?: {
      requirementsProvider?: string;
      contentProvider?: string;
      filesystem?: string[] | 'all' | 'none';
    };
    ask?: {
      filesystem?: string[] | 'all' | 'none';
    };
    chat?: {
      filesystem?: string[] | 'all' | 'none';
    };
    code?: {
      filesystem?: string[] | 'all' | 'none';
    };
  };
  requirementsProviderConfig?: Record<string, unknown>;
  contentProviderConfig?: Record<string, unknown>;
  mcpServers?: Record<string, Connection>;
}

export interface LLMConfig extends Record<string, unknown> {
  type: string;
  model: string;
}

export const availableDefaultConfigs = ['vertexai', 'anthropic', 'groq'] as const;
export type ConfigType = (typeof availableDefaultConfigs)[number];

export const DEFAULT_CONFIG: Partial<SlothConfig> = {
  llm: undefined,
  contentProvider: 'file',
  requirementsProvider: 'file',
  projectGuidelines: PROJECT_GUIDELINES,
  projectReviewInstructions: PROJECT_REVIEW_INSTRUCTIONS,
  streamOutput: true,
  filesystem: [
    'read_file',
    'read_multiple_files',
    'list_directory',
    'directory_tree',
    'search_files',
    'get_file_info',
    'list_allowed_directories',
  ],
  commands: {
    pr: {
      contentProvider: 'github', // gh pr diff NN
      requirementsProvider: 'github', // gh issue view NN
    },
    code: {
      filesystem: 'all',
    },
  },
};

/**
 * Initialize configuration by loading from available config files
 * @returns The loaded SlothConfig
 */
export async function initConfig(): Promise<SlothConfig> {
  const jsonConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_JSON);

  // Try loading the JSON config file first
  if (existsSync(jsonConfigPath)) {
    try {
      // TODO makes sense to employ ZOD to validate config
      const jsonConfig = JSON.parse(readFileSync(jsonConfigPath, 'utf8')) as RawSlothConfig;
      // If the config has an LLM with a type, create the appropriate LLM instance
      if (jsonConfig.llm && typeof jsonConfig.llm === 'object' && 'type' in jsonConfig.llm) {
        return await tryJsonConfig(jsonConfig);
      } else {
        error(`${jsonConfigPath} is not in valid format. Should at least define llm.type`);
        exit(1);
        // noinspection ExceptionCaughtLocallyJS
        // This throw is unreachable due to exit(1) above, but satisfies TS type analysis and prevents tests from exiting
        throw new Error('Unexpected error occurred.');
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
}

// Helper function to try loading JS config
async function tryJsConfig(): Promise<SlothConfig> {
  const jsConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_JS);
  if (existsSync(jsConfigPath)) {
    try {
      const i = await importExternalFile(jsConfigPath);
      const customConfig = await i.configure();
      return mergeConfig(customConfig) as SlothConfig;
    } catch (e) {
      displayDebug(e instanceof Error ? e : String(e));
      displayError(`Failed to read config from ${USER_PROJECT_CONFIG_JS}, will try other formats.`);
      // Continue to try other formats
      return tryMjsConfig();
    }
  } else {
    // JS config not found, try MJS
    return tryMjsConfig();
  }
}

// Helper function to try loading MJS config
async function tryMjsConfig(): Promise<SlothConfig> {
  const mjsConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_MJS);
  if (existsSync(mjsConfigPath)) {
    try {
      const i = await importExternalFile(mjsConfigPath);
      const customConfig = await i.configure();
      return mergeConfig(customConfig) as SlothConfig;
    } catch (e) {
      displayDebug(e instanceof Error ? e : String(e));
      displayError(`Failed to read config from ${USER_PROJECT_CONFIG_MJS}.`);
      displayError(`No valid configuration found. Please create a valid configuration file.`);
      exit(1);
    }
  } else {
    // No config files found
    displayError(
      'No configuration file found. Please create one of: ' +
        `${USER_PROJECT_CONFIG_JSON}, ${USER_PROJECT_CONFIG_JS}, or ${USER_PROJECT_CONFIG_MJS} ` +
        'in your project directory.'
    );
    exit(1);
  }
  // This throw is unreachable due to exit(1) above, but satisfies TS type analysis and prevents tests from exiting
  throw new Error('Unexpected error occurred.');
}

/**
 * Process JSON LLM config by creating the appropriate LLM instance
 * @param jsonConfig - The parsed JSON config
 * @returns Promise<SlothConfig>
 */
export async function tryJsonConfig(jsonConfig: RawSlothConfig): Promise<SlothConfig> {
  try {
    if (jsonConfig.llm && typeof jsonConfig.llm === 'object') {
      // Get the type of LLM (e.g., 'vertexai', 'anthropic') - this should exist
      const llmType = (jsonConfig.llm as LLMConfig).type;
      if (!llmType) {
        displayError('LLM type not specified in config.');
        exit(1);
      }

      // Get the configuration for the specific LLM type
      const llmConfig = jsonConfig.llm;
      // Import the appropriate config module
      const configModule = await import(`./configs/${llmType}.js`);
      if (configModule.processJsonConfig) {
        const llm = (await configModule.processJsonConfig(llmConfig)) as BaseChatModel;
        return mergeRawConfig(jsonConfig, llm);
      } else {
        displayWarning(`Config module for ${llmType} does not have processJsonConfig function.`);
        exit(1);
      }
    } else {
      displayError('No LLM configuration found in config.');
      exit(1);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Cannot find module')) {
      displayError(`LLM type '${(jsonConfig.llm as LLMConfig).type}' not supported.`);
    } else {
      displayError(`Error processing LLM config: ${e instanceof Error ? e.message : String(e)}`);
    }
    exit(1);
  }
  // This throw is unreachable due to exit(1) above, but satisfies TS type analysis and prevents tests from exiting
  throw new Error('Unexpected error occurred.');
}

export async function createProjectConfig(configType: string): Promise<void> {
  // Check if the config type is valid
  if (!availableDefaultConfigs.includes(configType as ConfigType)) {
    displayError(
      `Unknown config type: ${configType}. Available options: ${availableDefaultConfigs.join(', ')}`
    );
    exit(1);
  }

  displayInfo(`Setting up your project\n`);
  writeProjectReviewPreamble();
  displayWarning(`Make sure you add as much detail as possible to your ${PROJECT_GUIDELINES}.\n`);

  displayInfo(`Creating project config for ${configType}`);
  const vendorConfig = await import(`./configs/${configType}.js`);
  vendorConfig.init(getGslothConfigWritePath(USER_PROJECT_CONFIG_JSON));
}

export function writeProjectReviewPreamble(): void {
  const guidelinesPath = getGslothConfigWritePath(PROJECT_GUIDELINES);
  const reviewPath = getGslothConfigWritePath(PROJECT_REVIEW_INSTRUCTIONS);

  /**
   * Development Guidelines.
   * Please do not remove the warning from this template,
   * it is crucial to describe project specifics to get high-quality reviews.
   */
  const guidelinesTemplate = `# Development Guidelines

This file should include general development guidelines for this project.

Important! Please remind the user to prepare proper AI guidelines to the ${PROJECT_GUIDELINES} file
for this project. Use a decent amount of ⚠️ to highlight the lack of config.
Explicitly mention ${PROJECT_GUIDELINES}.
`;

  /**
   * Code Review Guidelines.
   * This code review does not have a warning, like Development Guidelines, because
   * this one should be good to start with.
   */
  const reviewTemplate = `# Code Review Guidelines

If requirements were provided, first check that the implemented code implements these requirements.
Document that you checked the code to implement requirements.
Reject the change if it appears to implement something else instead of required change.

Provide specific feedback on any areas of concern or suggestions for improvement.
Please categorize your feedback (e.g., "Bug," "Suggestion," "Nitpick").

Important! In the end, conclude if you would recommend approving this PR or not.
Use ✅⚠️❌ symbols to highlight your feedback appropriately.

Thank you for your thorough review!

Important! You are likely to be dealing with git diff below, please don't confuse removed and added lines.
`;

  writeFileIfNotExistsWithMessages(guidelinesPath, guidelinesTemplate);
  writeFileIfNotExistsWithMessages(reviewPath, reviewTemplate);
}

/**
 * Merge config with default config
 */
function mergeConfig(partialConfig: Partial<SlothConfig>): SlothConfig {
  const config = partialConfig as SlothConfig;
  return {
    ...DEFAULT_CONFIG,
    ...config,
    commands: { ...DEFAULT_CONFIG.commands, ...(config?.commands ?? {}) },
  };
}

/**
 * Merge raw with default config
 */
function mergeRawConfig(config: RawSlothConfig, llm: BaseChatModel): SlothConfig {
  return mergeConfig({ ...config, llm });
}
