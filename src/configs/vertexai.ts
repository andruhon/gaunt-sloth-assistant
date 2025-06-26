import path from 'node:path';
import { displayWarning } from '#src/consoleUtils.js';
import { getCurrentDir } from '#src/systemUtils.js';
import { writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { ChatVertexAIInput } from '@langchain/google-vertexai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

const jsonContent = `{
  "llm": {
    "type": "vertexai",
    "model": "gemini-2.5-pro-preview-05-06",
    "temperature": 0
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
    'For Google VertexAI you likely to need to do `gcloud auth login` and `gcloud auth application-default login`.'
  );
}

// Function to process JSON config and create VertexAI LLM instance
export async function processJsonConfig(llmConfig: ChatVertexAIInput): Promise<BaseChatModel> {
  const vertexAi = await import('@langchain/google-vertexai');
  return new vertexAi.ChatVertexAI({
    ...llmConfig,
    model: llmConfig.model || 'gemini-2.5-pro-preview-05-06',
  });
}
