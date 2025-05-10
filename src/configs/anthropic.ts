import { writeFileIfNotExistsWithMessages } from "../utils.js";
import path from "node:path";
import { displayWarning } from "../consoleUtils.js";
import { env } from "../systemUtils.js";
import type { SlothContext } from "../config.js";
import type { LLMConfig, ConfigModule } from "./types.js";

// Function to process JSON config and create Anthropic LLM instance
export async function processJsonConfig(llmConfig: LLMConfig): Promise<any> {
    const anthropic = await import('@langchain/anthropic');
    // Use environment variable if available, otherwise use the config value
    const anthropicApiKey = env.ANTHROPIC_API_KEY || llmConfig.apiKey;
    return new anthropic.ChatAnthropic({
        apiKey: anthropicApiKey,
        model: llmConfig.model || "claude-3-7-sonnet-20250219"
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
            model: "claude-3-7-sonnet-20250219" // Don't forget to check new models availability.
        })
    };
}
`;

const jsonContent = `{
  "llm": {
    "type": "anthropic",
    "apiKey": "your-api-key-here",
    "model": "claude-3-7-sonnet-20250219"
  }
}`;

export function init(configFileName: string, context: SlothContext): void {
    if (!context.currentDir) {
        throw new Error('Current directory not set');
    }
    path.join(context.currentDir, configFileName);

    // Determine which content to use based on file extension
    const content = configFileName.endsWith('.json') ? jsonContent : jsContent;

    writeFileIfNotExistsWithMessages(configFileName, content);
    displayWarning(`You need to update your ${configFileName} to add your Anthropic API key.`);
} 