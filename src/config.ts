import { displayDebug, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { v4 as uuidv4 } from 'uuid';
import { importExternalFile, writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { existsSync, readFileSync } from 'node:fs';
import { error, exit } from '#src/systemUtils.js';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getGslothConfigWritePath, getGslothConfigReadPath } from '#src/filePathUtils.js';

export interface SlothConfig extends BaseSlothConfig {
  llm: BaseChatModel; // FIXME this is still bad keeping instance in config is probably not best choice
  contentProvider: string;
  requirementsProvider: string;
  projectGuidelines: string;
  projectReviewInstructions: string;
  commands: {
    pr: {
      contentProvider: string;
    };
  };
  review?: {
    contentProvider?: string;
    requirementsProvider?: string;
  };
  pr?: {
    requirementsProvider?: string;
  };
  requirementsProviderConfig?: Record<string, unknown>;
  contentProviderConfig?: Record<string, unknown>;
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

// The SlothContext interface has been removed as part of the refactoring

/**
 * Session object containing configurable parameters for a single session
 */
export interface Session {
  configurable: {
    thread_id: string;
  };
}

/**
 * Creates a new session object with a unique thread_id
 */
export function createSession(): Session {
  return {
    configurable: {
      thread_id: uuidv4()
    }
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
export const PROJECT_GUIDELINES = '.gsloth.guidelines.md';
export const PROJECT_REVIEW_INSTRUCTIONS = '.gsloth.review.md';

export const availableDefaultConfigs = ['vertexai', 'anthropic', 'groq'] as const;
export type ConfigType = (typeof availableDefaultConfigs)[number];

export const DEFAULT_CONFIG = {
  llm: undefined as unknown as BaseChatModel, // This will be replaced during config initialization
  contentProvider: 'file',
  requirementsProvider: 'file',
  projectGuidelines: PROJECT_GUIDELINES,
  projectReviewInstructions: PROJECT_REVIEW_INSTRUCTIONS,
  commands: {
    pr: {
      contentProvider: 'gh',
    },
  },
} satisfies Partial<SlothConfig>;

// The slothContext object has been removed as part of the refactoring

export async function initConfig(): Promise<SlothConfig> {
  const jsonConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_JSON);
  const jsConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_JS);
  const mjsConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_MJS);
  let config: SlothConfig | undefined;

  // Try loading JSON config file first
  if (existsSync(jsonConfigPath)) {
    try {
      const jsonConfig = JSON.parse(readFileSync(jsonConfigPath, 'utf8')) as RawSlothConfig;
      // If the config has an LLM with a type, create the appropriate LLM instance
      if (jsonConfig.llm && typeof jsonConfig.llm === 'object' && 'type' in jsonConfig.llm) {
        config = await tryJsonConfig(jsonConfig);
        return config;
      } else {
        error(`${jsonConfigPath} is not in valid format. Should at least define llm.type`);
        exit(1);
        return DEFAULT_CONFIG as SlothConfig; // Never reached due to exit(1)
      }
    } catch (e) {
      displayDebug(e instanceof Error ? e : String(e));
      displayError(
        `Failed to read config from ${USER_PROJECT_CONFIG_JSON}, will try other formats.`
      );
      // Continue to try other formats
      config = await tryJsConfig();
      return config;
    }
  } else {
    // JSON config not found, try JS
    config = await tryJsConfig();
    return config;
  }

  // Helper function to try loading JS config
  async function tryJsConfig(): Promise<SlothConfig> {
    if (existsSync(jsConfigPath)) {
      try {
        const configModule = await importExternalFile(jsConfigPath);
        const partialConfig = await configModule.configure(jsConfigPath);
        return { ...DEFAULT_CONFIG, ...partialConfig } as SlothConfig;
      } catch (e) {
        displayDebug(e instanceof Error ? e : String(e));
        displayError(
          `Failed to read config from ${USER_PROJECT_CONFIG_JS}, will try other formats.`
        );
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
    if (existsSync(mjsConfigPath)) {
      try {
        const configModule = await importExternalFile(mjsConfigPath);
        const partialConfig = await configModule.configure(mjsConfigPath);
        return { ...DEFAULT_CONFIG, ...partialConfig } as SlothConfig;
      } catch (e) {
        displayDebug(e instanceof Error ? e : String(e));
        displayError(`Failed to read config from ${USER_PROJECT_CONFIG_MJS}.`);
        displayError(`No valid configuration found. Please create a valid configuration file.`);
        exit(1);
      }
      // This should never be reached as we exit on error
      return DEFAULT_CONFIG as SlothConfig;
    } else {
      // No config files found
      displayError(
        'No configuration file found. Please create one of: ' +
          `${USER_PROJECT_CONFIG_JSON}, ${USER_PROJECT_CONFIG_JS}, or ${USER_PROJECT_CONFIG_MJS} ` +
          'in your project directory.'
      );
      exit(1);
      // This should never be reached as we exit on error
      return DEFAULT_CONFIG as SlothConfig;
    }
  }
}

// Process JSON LLM config by creating the appropriate LLM instance
export async function tryJsonConfig(jsonConfig: RawSlothConfig): Promise<SlothConfig> {
  const llmConfig = jsonConfig?.llm;
  const llmType = llmConfig?.type?.toLowerCase();

  // Check if the LLM type is in availableDefaultConfigs
  if (!llmType || !availableDefaultConfigs.includes(llmType as ConfigType)) {
    displayError(
      `Unsupported LLM type: ${llmType}. Available types are: ${availableDefaultConfigs.join(', ')}`
    );
    exit(1);
    // This line will never be reached due to exit(1)
    return DEFAULT_CONFIG;
  }

  try {
    // Import the appropriate config module based on the LLM type
    try {
      const configModule = await import(`./configs/${llmType}.js`);
      if (configModule.processJsonConfig) {
        const llm = (await configModule.processJsonConfig(llmConfig)) as BaseChatModel;
        return { ...DEFAULT_CONFIG, ...jsonConfig, llm } as SlothConfig;
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
  
  // This should never happen as we should exit on error
  return DEFAULT_CONFIG as SlothConfig;
}

export async function createProjectConfig(configType: string): Promise<void> {
  displayInfo(`Setting up your project\n`);
  writeProjectReviewPreamble();
  displayWarning(`Make sure you add as much detail as possible to your ${PROJECT_GUIDELINES}.\n`);

  // Check if the config type is in availableDefaultConfigs
  if (!availableDefaultConfigs.includes(configType as ConfigType)) {
    displayError(
      `Unsupported config type: ${configType}. Available types are: ${availableDefaultConfigs.join(', ')}`
    );
    exit(1);
    // This line will never be reached due to exit(1)
    return;
  }

  displayInfo(`Creating project config for ${configType}`);
  const vendorConfig = await import(`./configs/${configType}.js`);
  const config = DEFAULT_CONFIG as SlothConfig;
  const session = createSession();
  vendorConfig.init(getGslothConfigWritePath(USER_PROJECT_CONFIG_JSON), { config, session });
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

