import path from 'node:path';
import { displayWarning } from '#src/consoleUtils.js';
import { env, getCurrentDir } from '#src/systemUtils.js';
import { writeFileIfNotExistsWithMessages } from '#src/utils.js';
import type { AnthropicInput } from '@langchain/anthropic';
import type {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';

// Function to process JSON config and create Anthropic LLM instance
export async function processJsonConfig(
  llmConfig: AnthropicInput & BaseChatModelParams
): Promise<BaseChatModel> {
  const anthropic = await import('@langchain/anthropic');
  // Use environment variable if available, otherwise use the config value
  const anthropicApiKey = env.ANTHROPIC_API_KEY || llmConfig.apiKey;
  return new anthropic.ChatAnthropic({
    ...llmConfig,
    apiKey: anthropicApiKey,
    model: llmConfig.model || 'claude-sonnet-4-20250514',
  });
}

const jsonContent = `{
  "llm": {
    "type": "anthropic",
    "model": "claude-sonnet-4-20250514"
  }
}`;

export function init(configFileName: string): void {
  const currentDir = getCurrentDir();
  path.join(currentDir, configFileName);

  // Determine which content to use based on file extension
  if (!configFileName.endsWith('.json')) {
    throw new Error('Only JSON config is supported.');
  }

  writeFileIfNotExistsWithMessages(configFileName, jsonContent);
  displayWarning(`You need to update your ${configFileName} to add your Anthropic API key.`);
}
