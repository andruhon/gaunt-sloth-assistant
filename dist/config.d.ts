export interface SlothConfig {
    llm?: any;
    contentProvider: string;
    requirementsProvider: string;
    commands: {
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
    requirementsProviderConfig?: Record<string, any>;
    contentProviderConfig?: Record<string, any>;
}
export interface SlothContext {
    installDir: string;
    currentDir: string;
    config: SlothConfig;
    stdin: string;
    session: {
        configurable: {
            thread_id: string;
        };
    };
}
export declare const USER_PROJECT_CONFIG_JS = ".gsloth.config.js";
export declare const USER_PROJECT_CONFIG_JSON = ".gsloth.config.json";
export declare const USER_PROJECT_CONFIG_MJS = ".gsloth.config.mjs";
export declare const SLOTH_INTERNAL_PREAMBLE = ".gsloth.preamble.internal.md";
export declare const USER_PROJECT_REVIEW_PREAMBLE = ".gsloth.preamble.review.md";
export declare const availableDefaultConfigs: readonly ["vertexai", "anthropic", "groq"];
export type ConfigType = typeof availableDefaultConfigs[number];
export declare const DEFAULT_CONFIG: SlothConfig;
export declare const slothContext: SlothContext;
export declare function initConfig(): Promise<void>;
export declare function tryJsonConfig(jsonConfig: Partial<SlothConfig>): Promise<void>;
export declare function createProjectConfig(configType: string): Promise<void>;
export declare function writeProjectReviewPreamble(): void;
