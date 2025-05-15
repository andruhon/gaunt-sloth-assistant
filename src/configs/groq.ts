import path from 'node:path';
import { displayInfo, displayWarning } from '#src/consoleUtils.js';
import { env, getCurrentDir } from '#src/systemUtils.js';
import { writeFileIfNotExistsWithMessages } from '#src/utils.js';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGroqInput } from '@langchain/groq';

// Function to process JSON config and create Groq LLM instance
export async function processJsonConfig(llmConfig: ChatGroqInput): Promise<BaseChatModel> {
  const groq = await import('@langchain/groq');
  // Use environment variable if available, otherwise use the config value
  const groqApiKey = env.GROQ_API_KEY || llmConfig.apiKey;
  return new groq.ChatGroq({
    ...llmConfig,
    apiKey: groqApiKey,
    model: llmConfig.model || 'deepseek-r1-distill-llama-70b',
  });
}

const jsContent = `/* eslint-disable */
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    const groq = await importFunction('@langchain/groq');
    return {
        llm: new groq.ChatGroq({
            model: "deepseek-r1-distill-llama-70b", // Check other models available
            apiKey: process.env.GROQ_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
        })
    };
}
`;

const jsonContent = `{
  "llm": {
    "type": "groq",
    "model": "deepseek-r1-distill-llama-70b",
    "apiKey": "your-api-key-here"
  }
}`;

export function init(configFileName: string): void {
  const currentDir = getCurrentDir();
  path.join(currentDir, configFileName);

  // Determine which content to use based on file extension
  const content = configFileName.endsWith('.json') ? jsonContent : jsContent;

  writeFileIfNotExistsWithMessages(configFileName, content);
  displayInfo(
    `You can define GROQ_API_KEY environment variable with your Groq API key and it will work with default model.`
  );
  displayWarning(`You need to edit your ${configFileName} to configure model.`);
}
