import path from 'node:path';
import { displayWarning } from '#src/consoleUtils.js';
import { env, getCurrentDir } from '#src/systemUtils.js';
import { writeFileIfNotExistsWithMessages } from '#src/utils.js';
import type {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { ChatDeepSeekInput } from '@langchain/deepseek';

// Function to process JSON config and create DeepSeek LLM instance
export async function processJsonConfig(
  llmConfig: ChatDeepSeekInput & BaseChatModelParams
): Promise<BaseChatModel> {
  const deepseek = await import('@langchain/deepseek');
  // Use environment variable if available, otherwise use the config value
  const deepseekApiKey = env.DEEPSEEK_API_KEY || llmConfig.apiKey;
  return new deepseek.ChatDeepSeek({
    ...llmConfig,
    apiKey: deepseekApiKey,
    model: llmConfig.model || 'deepseek-reasoner',
  });
}

const jsonContent = `{
  "llm": {
    "type": "deepseek",
    "model": "deepseek-reasoner"
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
  displayWarning(
    `You need to update your ${configFileName} to add your DeepSeek API key, ` +
      'or define DEEPSEEK_API_KEY environment variable.'
  );
}
