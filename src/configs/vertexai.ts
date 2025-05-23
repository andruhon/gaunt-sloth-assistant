import path from 'node:path';
import { displayWarning } from '#src/consoleUtils.js';
import { getCurrentDir } from '#src/systemUtils.js';
import { writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { ChatVertexAIInput } from '@langchain/google-vertexai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

const jsContent = `/* eslint-disable */
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    const vertexAi = await importFunction('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro-preview-05-06", // Consider checking for latest recommended model versions
            // temperature: 0,
            // Other parameters might be relevant depending on Vertex AI API updates
            // The project is not in the interface, but it is in documentation
            // project: 'your-cool-gcloud-project'
        })
    }
}
`;

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
  const content = configFileName.endsWith('.json') ? jsonContent : jsContent;

  writeFileIfNotExistsWithMessages(configFileName, content);
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
