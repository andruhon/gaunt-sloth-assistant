import { SlothContext } from './commands';

export interface LLMConfig {
    type: string;
    [key: string]: any;
}

export function processJsonConfig(llmConfig: LLMConfig): Promise<any>;
export function init(configFileName: string, context: SlothContext): Promise<void>; 