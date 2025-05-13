import type { SlothContext } from "#src/config.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface LLMConfig {
  type: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  responses?: string[];
  [key: string]: unknown;
}

export interface ConfigModule {
  init: (configFileName: string, context: SlothContext) => void;
  processJsonConfig: (llmConfig: LLMConfig) => Promise<BaseChatModel | null>;
}
