import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

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
}

/**
 * Raw, unprocessed sloth config
 */
export interface RawSlothConfig extends BaseSlothConfig {
  llm: LLMConfig;
}

/**
 * Base sloth config for extending
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

/**
 * @deprecated
 * this object has blurred responsibility lines and bad name.
 * Use ConfigManager and SessionManager instead.
 */
export interface SlothContext {
  config: SlothConfig;
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
export const PROJECT_GUIDELINES = '.gsloth.guidelines.md';
export const PROJECT_REVIEW_INSTRUCTIONS = '.gsloth.review.md';

export const availableDefaultConfigs = ['vertexai', 'anthropic', 'groq'] as const;
export type ConfigType = (typeof availableDefaultConfigs)[number];

export const DEFAULT_CONFIG: Partial<SlothConfig> = {
  llm: undefined,
  contentProvider: 'file',
  requirementsProvider: 'file',
  projectGuidelines: PROJECT_GUIDELINES,
  projectReviewInstructions: PROJECT_REVIEW_INSTRUCTIONS,
  commands: {
    pr: {
      contentProvider: 'gh',
    },
  },
};

// Export configuration functions from ConfigManager
export { ConfigManager } from './managers/configManager.js';

// Export session functions from SessionManager
export { SessionManager, type Session } from './managers/sessionManager.js';

/**
 * Initialize the configuration by loading from config files
 * This is a convenience function that uses ConfigManager
 */
export async function initConfig(): Promise<void> {
  const { ConfigManager } = await import('./managers/configManager.js');
  await ConfigManager.getInstance().init();
}

/**
 * Create a project configuration
 * This is a convenience function that uses ConfigManager
 */
export async function createProjectConfig(configType: string): Promise<void> {
  const { ConfigManager } = await import('./managers/configManager.js');
  await ConfigManager.getInstance().createProjectConfig(configType);
}

/**
 * Write project review preamble files
 * This is a convenience function that uses ConfigManager
 */
export function writeProjectReviewPreamble(): void {
  // Use a dynamic import that immediately resolves
  import('./managers/configManager.js')
    .then(({ ConfigManager }) => {
      ConfigManager.getInstance().writeProjectReviewPreamble();
    })
    .catch((e) => console.error('Error importing ConfigManager:', e));
}

// Helper to lazily import the modules when needed
async function getConfigManager() {
  // Using dynamic import to avoid circular dependencies
  const { ConfigManager } = await import('./managers/configManager.js');
  return ConfigManager.getInstance();
}

async function getSessionManager() {
  // Using dynamic import to avoid circular dependencies
  const { SessionManager } = await import('./managers/sessionManager.js');
  return SessionManager.getInstance();
}

/**
 * @deprecated
 * This is the legacy slothContext object that should not be used in new code.
 * It is maintained for backward compatibility until all code is migrated.
 */
export const slothContext: SlothContext = new Proxy({} as SlothContext, {
  async get(target, prop) {
    // On first access, import the managers and create the proxy object
    if (prop === 'config') {
      const manager = await getConfigManager();
      return manager.config;
    }
    if (prop === 'session') {
      const manager = await getSessionManager();
      return manager.session;
    }
    return undefined;
  },
  set() {
    console.warn(
      'Setting properties on slothContext is deprecated. Use ConfigManager or SessionManager instead.'
    );
    return true; // Indicate success but don't actually set anything
  },
});

/**
 * @deprecated test only
 * Use ConfigManager.reset() and SessionManager.reset() instead
 */
export async function reset() {
  const configManager = await getConfigManager();
  const sessionManager = await getSessionManager();
  configManager.reset();
  sessionManager.reset();
}
