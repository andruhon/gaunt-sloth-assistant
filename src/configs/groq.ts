import path from "node:path";
import type { SlothContext } from "../config.js";
import { displayInfo, displayWarning } from "../consoleUtils.js";
import { env } from "../systemUtils.js";
import { writeFileIfNotExistsWithMessages } from "../utils.js";
import type { LLMConfig } from "./types.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Function to process JSON config and create Groq LLM instance
export async function processJsonConfig(llmConfig: LLMConfig): Promise<BaseChatModel> {
  const groq = await import("@langchain/groq");
  // Use environment variable if available, otherwise use the config value
  const groqApiKey = env.GROQ_API_KEY || llmConfig.apiKey;
  return new groq.ChatGroq({
    apiKey: groqApiKey,
    model: llmConfig.model || "deepseek-r1-distill-llama-70b",
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

export function init(configFileName: string, context: SlothContext): void {
  if (!context.currentDir) {
    throw new Error("Current directory not set");
  }
  path.join(context.currentDir, configFileName);

  // Determine which content to use based on file extension
  const content = configFileName.endsWith(".json") ? jsonContent : jsContent;

  writeFileIfNotExistsWithMessages(configFileName, content);
  displayInfo(
    `You can define GROQ_API_KEY environment variable with your Groq API key and it will work with default model.`
  );
  displayWarning(`You need to edit your ${configFileName} to configure model.`);
}
