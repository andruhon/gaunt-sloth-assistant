import {
    END,
    MemorySaver,
    MessagesAnnotation,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { initConfig, slothContext } from "../config.js";
import { display, displayError, displaySuccess } from "../consoleUtils.js";
import { fileSafeLocalDate, toFileSafeString, ProgressIndicator, extractLastMessageContent } from "../utils.js";

export async function review(source, preamble, diff) {
    const progressIndicator = new ProgressIndicator("Reviewing.");
    const outputContent = await reviewInner(slothContext, () => progressIndicator.indicate(), preamble, diff);
    const filePath = path.resolve(process.cwd(), toFileSafeString(source)+'-'+fileSafeLocalDate()+".md");
    process.stdout.write("\n");
    display(`writing ${filePath}`);
    process.stdout.write("\n");
    // TODO highlight LLM output with something like Prism.JS (maybe system emoj are enough ✅⚠️❌)
    display(outputContent);
    try {
        writeFileSync(filePath, outputContent);
        displaySuccess(`This report can be found in ${filePath}`);
    } catch (error) {
        displayError(`Failed to write review to file: ${filePath}`);
        displayError(error.message);
        // Consider if you want to exit or just log the error
        // process.exit(1);
    }
}

export async function reviewInner(context, indicateProgress, preamble, diff) {
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
    const memory = new MemorySaver(); // TODO extract to config

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
            content: diff, // The code diff goes here
        },
    ];

    indicateProgress();
    // TODO create proper progress indicator for async tasks.
    const progress = setInterval(() => indicateProgress(), 1000);
    const output = await app.invoke({messages}, context.session);
    clearInterval(progress);
    return extractLastMessageContent(output);
}
