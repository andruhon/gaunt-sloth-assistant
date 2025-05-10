import type { SlothContext } from '../config.js';

export interface LLMConfig {
    type: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
    responses?: string[];
    [key: string]: any;
}

export interface ConfigModule {
    init: (configFileName: string, context: SlothContext) => void;
    processJsonConfig: (llmConfig: LLMConfig) => Promise<any>;
} 