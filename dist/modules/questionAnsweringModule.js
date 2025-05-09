import { END, MemorySaver, MessagesAnnotation, START, StateGraph, } from "@langchain/langgraph";
import { writeFileSync } from "node:fs";
import * as path from "node:path";
import { slothContext } from "../config.js";
import { display, displayError, displaySuccess } from "../consoleUtils.js";
import { extractLastMessageContent, fileSafeLocalDate, ProgressIndicator, toFileSafeString } from "../utils.js";
import { getCurrentDir } from "../systemUtils.js";
/**
 * Ask a question and get an answer from the LLM
 * @param {string} source - The source of the question (used for file naming)
 * @param {string} preamble - The preamble to send to the LLM
 * @param {string} content - The content of the question
 */
export async function askQuestion(source, preamble, content) {
    const progressIndicator = new ProgressIndicator("Thinking.");
    const outputContent = await askQuestionInner(slothContext, () => progressIndicator.indicate(), preamble, content);
    const filePath = path.resolve(getCurrentDir(), toFileSafeString(source) + '-' + fileSafeLocalDate() + ".md");
    display(`\nwriting ${filePath}`);
    // TODO highlight LLM output with something like Prism.JS
    display('\n' + outputContent);
    try {
        writeFileSync(filePath, outputContent);
        displaySuccess(`This report can be found in ${filePath}`);
    }
    catch (error) {
        displayError(`Failed to write answer to file: ${filePath}`);
        displayError(error.message);
        // TODO Consider if we want to exit or just log the error
        // exit(1);
    }
}
/**
 * Inner function to ask a question and get an answer from the LLM
 * @param {Object} context - The context object
 * @param {Function} indicateProgress - Function to indicate progress
 * @param {string} preamble - The preamble to send to the LLM
 * @param {string} content - The content of the question
 * @returns {string} The answer from the LLM
 */
export async function askQuestionInner(context, indicateProgress, preamble, content) {
    // This node receives the current state (messages) and invokes the LLM
    const callModel = async (state) => {
        // state.messages will contain the list including the system preamble and user diff
        const response = await context.config.llm.invoke(state.messages);
        // MessagesAnnotation expects the node to return the new message(s) to be added to the state.
        // Wrap the response in an array if it's a single message object.
        return { messages: response };
    };
    // Define the graph structure with MessagesAnnotation state
    const workflow = new StateGraph(MessagesAnnotation)
        // Define the node and edge
        .addNode("model", callModel)
        .addEdge(START, "model") // Start at the 'model' node
        .addEdge("model", END); // End after the 'model' node completes
    // Set up memory (optional but good practice for potential future multi-turn interactions)
    const memory = new MemorySaver();
    // Compile the workflow into a runnable app
    const app = workflow.compile({ checkpointer: memory });
    // Construct the initial the messages including the preamble as a system message
    const messages = [
        {
            role: "system",
            content: preamble, // The preamble goes here
        },
        {
            role: "user",
            content, // The question goes here
        },
    ];
    indicateProgress();
    // TODO create proper progress indicator for async tasks.
    const progress = setInterval(() => indicateProgress(), 1000);
    const output = await app.invoke({ messages }, context.session);
    clearInterval(progress);
    return extractLastMessageContent(output);
}
//# sourceMappingURL=questionAnsweringModule.js.map