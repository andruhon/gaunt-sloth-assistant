import path from 'node:path';
import { displayWarning } from '#src/consoleUtils.js';
import { env, getCurrentDir } from '#src/systemUtils.js';
import { writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';

// Function to process JSON config and create Anthropic LLM instance
export async function processJsonConfig(
  llmConfig: ChatGoogleGenerativeAI & BaseChatModelParams
): Promise<BaseChatModel> {
  const gemini = await import('@langchain/google-genai');
  // Use config value if available, otherwise use the environment variable
  const geminiApiKey = llmConfig.apiKey || env.GEMINI_API_KEY;
  return new gemini.ChatGoogleGenerativeAI({
    ...llmConfig,
    apiKey: geminiApiKey,
    model: llmConfig.model || 'gemini-2.5-pro',
  });
}

const jsonContent = `{
  "llm": {
    "type": "gemini",
    "model": "gemini-2.5-pro"
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
    `You need to update your ${configFileName} to add your Gemini API key, ` +
      'or define GEMINI_API_KEY environment variable.'
  );
}
