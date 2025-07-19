import { displayDebug, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { importExternalFile, writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { existsSync, readFileSync } from 'node:fs';
import { error, exit, setUseColour } from '#src/systemUtils.js';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getGslothConfigReadPath, getGslothConfigWritePath } from '#src/filePathUtils.js';
import type { Connection } from '@langchain/mcp-adapters';
import type { BaseToolkit, StructuredToolInterface } from '@langchain/core/tools';
import {
  PROJECT_GUIDELINES,
  PROJECT_REVIEW_INSTRUCTIONS,
  USER_PROJECT_CONFIG_JS,
  USER_PROJECT_CONFIG_JSON,
  USER_PROJECT_CONFIG_MJS,
} from '#src/constants.js';
import { JiraConfig } from '#src/providers/types.js';
import { resolve } from 'node:path';
import type { GthAgentInterface } from '#src/core/types.js';
import type { GthAgentRunner } from '#src/core/GthAgentRunner.js';
import type { Message } from '#src/modules/types.js';
import { RunnableConfig } from '@langchain/core/runnables';

/**
 * This is a processed Gaunt Sloth config ready to be passed down into components.
 */
export interface GthConfig extends BaseGthConfig {
  llm: BaseChatModel;
  contentProvider: string;
  requirementsProvider: string;
  projectGuidelines: string;
  projectReviewInstructions: string;
  streamOutput: boolean;
  useColour: boolean;
  filesystem: string[] | 'all' | 'read' | 'none';
  builtInTools?: string[];
  tools?: StructuredToolInterface[] | BaseToolkit[];
  /**
   * Hooks are only available on JS config
   */
  hooks?: {
    createRunnableConfig?: (config: GthConfig) => Promise<RunnableConfig>;
    createAgent?: (config: GthConfig) => Promise<GthAgentInterface>;
    beforeAgentInit?: RunnerHook | RunnerHook[];
    /**
     * After agent init.
     */
    afterAgentInit?: RunnerHook | RunnerHook[];
    beforeProcessMessages?: BeforeMessageHook | BeforeMessageHook[];
  };
}

type RunnerHook = (runner: GthAgentRunner) => Promise<void>;

type BeforeMessageHook = (
  runner: GthAgentRunner,
  message: Message[],
  runConfig: RunnableConfig
) => Promise<void>;

/**
 * Raw, unprocessed Gaunt Sloth config.
 */
export interface RawGthConfig extends BaseGthConfig {
  llm: LLMConfig;
}

/**
 * Do not export this one.
 * This is a basic interface for Gaunt Sloth config.
 */
interface BaseGthConfig {
  debugLog?: boolean;
  llm: unknown;
  contentProvider?: string;
  requirementsProvider?: string;
  projectGuidelines?: string;
  projectReviewInstructions?: string;
  streamOutput?: boolean;
  useColour?: boolean;
  filesystem?: string[] | 'all' | 'read' | 'none';
  customToolsConfig?: CustomToolsConfig;
  requirementsProviderConfig?: Record<string, unknown>;
  contentProviderConfig?: Record<string, unknown>;
  mcpServers?: Record<string, Connection>;
  builtInTools?: string[];
  builtInToolsConfig?: BuiltInToolsConfig;
  commands?: {
    pr?: {
      contentProvider?: string;
      requirementsProvider?: string;
      filesystem?: string[] | 'all' | 'read' | 'none';
      builtInTools?: string[];
      logWorkForReviewInSeconds?: number;
    };
    review?: {
      requirementsProvider?: string;
      contentProvider?: string;
      filesystem?: string[] | 'all' | 'read' | 'none';
      builtInTools?: string[];
    };
    ask?: {
      filesystem?: string[] | 'all' | 'read' | 'none';
      builtInTools?: string[];
    };
    chat?: {
      filesystem?: string[] | 'all' | 'read' | 'none';
      builtInTools?: string[];
    };
    code?: {
      filesystem?: string[] | 'all' | 'read' | 'none';
      builtInTools?: string[];
      devTools?: GthDevToolsConfig;
    };
  };
}

export type CustomToolsConfig = Record<string, object>;
export type BuiltInToolsConfig = {
  jira: JiraConfig;
};

/**
 * Config for {@link GthDevToolkit}.
 * Tools are not applied when config is not provided.
 * Only available in `code` mode.
 */
export interface GthDevToolsConfig {
  /**
   * Optional shell command to run tests.
   * Not applied when config is not provided.
   */
  run_tests?: string;
  /**
   * Optional shell command to run static analysis (lint).
   * Not applied when config is not provided.
   */
  run_lint?: string;
  /**
   * Optional shell command to run the build.
   * Not applied when config is not provided.
   */
  run_build?: string;
  /**
   * Optional shell command to run a single test file.
   * Supports command interpolation with the `${testPath}` placeholder.
   * Example: "npm test -- ${testPath}" or "jest ${testPath}"
   * Example: "npm test" - the test will simply be appended
   * Not applied when config is not provided.
   */
  run_single_test?: string;
}

export interface LLMConfig extends Record<string, unknown> {
  type: string;
  model: string;
  configuration: Record<string, unknown>;
  apiKeyEnvironmentVariable?: string;
}

export const availableDefaultConfigs = [
  'vertexai',
  'anthropic',
  'groq',
  'deepseek',
  'openai',
  'google-genai',
  'xai',
  'openrouter',
] as const;
export type ConfigType = (typeof availableDefaultConfigs)[number];

/**
 * Use this to store to keep config overrides global command parameters
 */
const commandLineConfigOverrides = {
  customConfigPath: undefined as undefined | string,
  verbose: undefined as undefined | boolean,
};

export function setCustomConfigPath(path: string): void {
  commandLineConfigOverrides.customConfigPath = resolve(path);
}

/**
 * Set LangChain/LangGraph to verbose mode,
 * causing LangChain/LangGraph to log many details to the console.
 * debugLog from config.ts may be a less intrusive option.
 */
export function setVerbose(verbose: boolean) {
  commandLineConfigOverrides.verbose = verbose;
}

export function getCustomConfigPath(): string | undefined {
  return commandLineConfigOverrides.customConfigPath;
}

export function clearCustomConfigPath(): void {
  commandLineConfigOverrides.customConfigPath = undefined;
}

export const DEFAULT_CONFIG: Partial<GthConfig> = {
  llm: undefined,
  contentProvider: 'file',
  requirementsProvider: 'file',
  projectGuidelines: PROJECT_GUIDELINES,
  projectReviewInstructions: PROJECT_REVIEW_INSTRUCTIONS,
  streamOutput: true,
  useColour: true,
  filesystem: 'read',
  /**
   * Log messages and events to gaunt-sloth.log,
   * use llm.verbose or `gth --verbose` as more intrusive option, setting verbose to LangChain / LangGraph
   */
  debugLog: false,
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
 * @returns The loaded GthConfig
 */
export async function initConfig(): Promise<GthConfig> {
  if (
    commandLineConfigOverrides.customConfigPath &&
    !existsSync(commandLineConfigOverrides.customConfigPath)
  ) {
    throw new Error(
      `Provided manual config "${commandLineConfigOverrides.customConfigPath}" does not exist`
    );
  }

  const jsonConfigPath =
    commandLineConfigOverrides.customConfigPath ??
    getGslothConfigReadPath(USER_PROJECT_CONFIG_JSON);

  // Try loading the JSON config file first
  if (jsonConfigPath.endsWith('.json') && existsSync(jsonConfigPath)) {
    try {
      // TODO makes sense to employ ZOD to validate config
      const jsonConfig = JSON.parse(readFileSync(jsonConfigPath, 'utf8')) as RawGthConfig;
      // If the config has an LLM with a type, create the appropriate LLM instance
      if (jsonConfig.llm && typeof jsonConfig.llm === 'object' && 'type' in jsonConfig.llm) {
        return await tryJsonConfig(jsonConfig);
      } else {
        error(`${jsonConfigPath} is not in valid format. Should at least define llm.type`);
        exit(1);
        // noinspection ExceptionCaughtLocallyJS
        // This throw is unreachable due to exit(1) above, but satisfies TS type analysis and prevents tests from exiting
        // noinspection ExceptionCaughtLocallyJS
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
async function tryJsConfig(): Promise<GthConfig> {
  const jsConfigPath =
    commandLineConfigOverrides.customConfigPath ?? getGslothConfigReadPath(USER_PROJECT_CONFIG_JS);
  if (jsConfigPath.endsWith('.js') && existsSync(jsConfigPath)) {
    try {
      const i = await importExternalFile(jsConfigPath);
      const customConfig = await i.configure();
      return mergeConfig(customConfig) as GthConfig;
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
async function tryMjsConfig(): Promise<GthConfig> {
  const mjsConfigPath =
    commandLineConfigOverrides.customConfigPath ?? getGslothConfigReadPath(USER_PROJECT_CONFIG_MJS);
  if (mjsConfigPath.endsWith('.mjs') && existsSync(mjsConfigPath)) {
    try {
      const i = await importExternalFile(mjsConfigPath);
      const customConfig = await i.configure();
      return mergeConfig(customConfig) as GthConfig;
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
 * @returns Promise<GthConfig>
 */
export async function tryJsonConfig(jsonConfig: RawGthConfig): Promise<GthConfig> {
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
      const configModule = await import(`./presets/${llmType}.js`);
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
  const vendorConfig = await import(`./presets/${configType}.js`);
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
function mergeConfig(partialConfig: Partial<GthConfig>): GthConfig {
  const config = partialConfig as GthConfig;
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    commands: { ...DEFAULT_CONFIG.commands, ...(config?.commands ?? {}) },
  };

  if (commandLineConfigOverrides.verbose !== undefined) {
    mergedConfig.llm.verbose = commandLineConfigOverrides.verbose;
  }

  // Set the useColour value in systemUtils
  setUseColour(mergedConfig.useColour);

  return mergedConfig;
}

/**
 * Merge raw with default config
 */
function mergeRawConfig(config: RawGthConfig, llm: BaseChatModel): GthConfig {
  return mergeConfig({ ...config, llm });
}
