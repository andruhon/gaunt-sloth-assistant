import {
    END,
    MemorySaver,
    MessagesAnnotation,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { slothContext } from "./config.js";
import { display, displayError, displaySuccess } from "./consoleUtils.js";
import { fileSafeLocalDate, toFileSafeString } from "./utils.js";

export async function askQuestion(source, preamble, content) {
    // This node receives the current state (messages) and invokes the LLM
    const callModel = async (state) => {
        // state.messages will contain the list including the system preamble and user diff
        const response = await slothContext.config.llm.invoke(state.messages);
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
            content, // The code diff goes here
        },
    ];

    display("Thinking...");
    const output = await app.invoke({messages}, slothContext.session);
    // FIXME this looks ugly, there should be other way
    const outputContent = output.messages[output.messages.length - 1].content;
    const filePath = path.resolve(process.cwd(), toFileSafeString(source)+'-'+fileSafeLocalDate()+".md");
    display(`writing ${filePath}`);
    // TODO highlight LLM output with something like Prism.JS
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
