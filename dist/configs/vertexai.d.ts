import type { SlothContext } from "../config.js";
import type { LLMConfig } from "./types.js";
export declare function init(configFileName: string, context: SlothContext): void;
export declare function processJsonConfig(llmConfig: LLMConfig): Promise<any>;
