import {writeFileIfNotExistsWithMessages} from "../utils.js";
import path from "node:path";
import {displayInfo, displayWarning} from "../consoleUtils.js";
import {USER_PROJECT_CONFIG_FILE} from "../config.js";

const content = `/* eslint-disable */
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

export function init(configFileName, context) {
    path.join(context.currentDir, configFileName);
    writeFileIfNotExistsWithMessages(configFileName, content);
    displayInfo(`You can define GROQ_API_KEY environment variable with your Groq API key and it will work with default model.`);
    displayWarning(`You need to edit your ${USER_PROJECT_CONFIG_FILE} to to configure model.`);
}