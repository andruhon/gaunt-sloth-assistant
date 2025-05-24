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

const jsContent = `/* eslint-disable */
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    // At a moment only google-vertexai and anthropic packaged with Sloth, but you can install support for any other langchain llms
    const anthropic = await importFunction('@langchain/anthropic');
    return {
        llm: new anthropic.ChatAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
            model: "claude-sonnet-4-20250514" // Don't forget to check new models availability.
        })
    };
}
`;

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
  const content = configFileName.endsWith('.json') ? jsonContent : jsContent;

  writeFileIfNotExistsWithMessages(configFileName, content);
  displayWarning(`You need to update your ${configFileName} to add your Anthropic API key.`);
}
