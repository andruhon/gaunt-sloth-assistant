import {writeFileIfNotExistsWithMessages} from "../utils.js";
import path from "node:path";
import {displayWarning} from "../consoleUtils.js";
import {USER_PROJECT_CONFIG_FILE} from "../config.js";

const content = `/* eslint-disable */
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    // At a moment only google-vertexai and anthropic packaged with Sloth, but you can install support for any other langchain llms
    const anthropic = await importFunction('@langchain/anthropic');
    return {
        llm: new anthropic.ChatAnthropic({
            apiKey: "sk-ant-api--YOUR_API_HASH", // You should put your API hash here
            model: "claude-3-5-sonnet-20241022" // Don't forget to check new models availability.
        })
    };
}
`;

export function init(configFileName, context) {
    path.join(context.currentDir, configFileName);
    writeFileIfNotExistsWithMessages(configFileName, content);
    displayWarning(`You need to update your ${USER_PROJECT_CONFIG_FILE} to add your Anthropic API key.`);
}