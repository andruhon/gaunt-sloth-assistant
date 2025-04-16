import {writeFileIfNotExistsWithMessages} from "../utils.js";
import path from "node:path";
import {displayWarning} from "../consoleUtils.js";

const content = `/* eslint-disable */
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    const vertexAi = await importFunction('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro-exp-03-25", // Consider checking for latest recommended model versions
            // temperature: 0,
            // Other parameters might be relevant depending on Vertex AI API updates
            // The project is not in the interface, but it is in documentation (seems to work unimarket-development as well)
            // project: 'your-cool-gcloud-project'
        })
    }
}
`;

export function init(configFileName, context) {
    path.join(context.currentDir, configFileName);
    writeFileIfNotExistsWithMessages(configFileName, content);
    displayWarning("For Google VertexAI you likely to need to do `gcloud auth login` and `gcloud auth application-default login`.");
}