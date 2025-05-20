import { v4 as uuidv4 } from 'uuid';
import { displayDebug, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { importExternalFile, writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { existsSync, readFileSync } from 'node:fs';
import { error, exit } from '#src/systemUtils.js';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getGslothConfigWritePath, getGslothConfigReadPath } from '#src/filePathUtils.js';
import {
  USER_PROJECT_CONFIG_JS,
  USER_PROJECT_CONFIG_JSON,
  USER_PROJECT_CONFIG_MJS,
  PROJECT_GUIDELINES,
  PROJECT_REVIEW_INSTRUCTIONS,
  availableDefaultConfigs,
  ConfigType,
  SlothConfig,
  RawSlothConfig,
  DEFAULT_CONFIG,
} from '../config.js';

/**
 * ConfigManager handles loading and accessing configuration
 * It provides a singleton instance for the application to use
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private _config: SlothConfig;

  private constructor() {
    this._config = { ...DEFAULT_CONFIG } as SlothConfig;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get the current configuration
   */
  public get config(): SlothConfig {
    return this._config;
  }

  /**
   * Initialize configuration by loading from config files
   */
  public async init(): Promise<void> {
    const jsonConfigPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_JSON);

    // Try loading JSON config file first
    if (existsSync(jsonConfigPath)) {
      try {
        const jsonConfig = JSON.parse(readFileSync(jsonConfigPath, 'utf8')) as RawSlothConfig;
        // If the config has an LLM with a type, create the appropriate LLM instance
        if (jsonConfig.llm && typeof jsonConfig.llm === 'object' && 'type' in jsonConfig.llm) {
          await this.tryJsonConfig(jsonConfig);
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
        return this.tryJsConfig();
      }
    } else {
      // JSON config not found, try JS
      return this.tryJsConfig();
    }
  }

  /**
   * Try loading JS config
   */
  private async tryJsConfig(): Promise<void> {
    const configPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_JS);

    if (existsSync(configPath)) {
      return importExternalFile(configPath)
        .then((i: { configure: (module: string) => Promise<Partial<SlothConfig>> }) =>
          i.configure(configPath)
        )
        .then((config) => {
          this._config = { ...this._config, ...config };
        })
        .catch((e) => {
          displayDebug(e instanceof Error ? e : String(e));
          displayError(
            `Failed to read config from ${USER_PROJECT_CONFIG_JS}, will try other formats.`
          );
          // Continue to try other formats
          return this.tryMjsConfig();
        });
    } else {
      // JS config not found, try MJS
      return this.tryMjsConfig();
    }
  }

  /**
   * Try loading MJS config
   */
  private async tryMjsConfig(): Promise<void> {
    const configPath = getGslothConfigReadPath(USER_PROJECT_CONFIG_MJS);

    if (existsSync(configPath)) {
      return importExternalFile(configPath)
        .then((i: { configure: (module: string) => Promise<Partial<SlothConfig>> }) =>
          i.configure(configPath)
        )
        .then((config) => {
          this._config = { ...this._config, ...config };
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

  /**
   * Process JSON LLM config by creating the appropriate LLM instance
   */
  public async tryJsonConfig(jsonConfig: RawSlothConfig): Promise<void> {
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
        const configModule = await import(`../configs/${llmType}.js`);
        if (configModule.processJsonConfig) {
          const llm = (await configModule.processJsonConfig(llmConfig)) as BaseChatModel;
          this._config = { ...this._config, ...jsonConfig, llm };
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

  /**
   * Create project configuration files
   */
  public async createProjectConfig(configType: string): Promise<void> {
    displayInfo(`Setting up your project\n`);
    this.writeProjectReviewPreamble();
    displayWarning(`Make sure you add as much detail as possible to your ${PROJECT_GUIDELINES}.\n`);

    // Check if the config type is in availableDefaultConfigs
    if (!availableDefaultConfigs.includes(configType as ConfigType)) {
      displayError(
        `Unsupported config type: ${configType}. Available types are: ${availableDefaultConfigs.join(', ')}`
      );
      exit(1);
      return;
    }

    displayInfo(`Creating project config for ${configType}`);
    const vendorConfig = await import(`../configs/${configType}.js`);

    // Create a session object for backwards compatibility
    const session = { configurable: { thread_id: uuidv4() } };

    // Call the vendor config init with a backward compatible context
    const backwardCompatibleContext = {
      config: this._config,
      session,
    };

    vendorConfig.init(
      getGslothConfigWritePath(USER_PROJECT_CONFIG_JSON),
      backwardCompatibleContext
    );
  }

  /**
   * Write project review template files
   */
  public writeProjectReviewPreamble(): void {
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
   * For testing purposes only
   */
  public reset(): void {
    this._config = { ...DEFAULT_CONFIG } as SlothConfig;
  }
}
