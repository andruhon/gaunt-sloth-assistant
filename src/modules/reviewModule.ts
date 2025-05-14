import type { SlothContext } from '#src/config.js';
import { slothContext } from '#src/config.js';
import { display, displayDebug, displayError, displaySuccess } from '#src/consoleUtils.js';
import type { Message, ProgressCallback, State } from '#src/modules/types.js';
import { getCurrentDir, stdout } from '#src/systemUtils.js';
import { fileSafeLocalDate, ProgressIndicator, toFileSafeString } from '#src/utils.js';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessageChunk, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

export async function review(source: string, preamble: string, diff: string): Promise<void> {
  const progressIndicator = new ProgressIndicator('Reviewing.');
  const outputContent = await reviewInner(
    slothContext,
    () => progressIndicator.indicate(),
    preamble,
    diff
  );
  const filePath = path.resolve(
    getCurrentDir(),
    toFileSafeString(source) + '-' + fileSafeLocalDate() + '.md'
  );
  stdout.write('\n');
  display(`writing ${filePath}`);
  stdout.write('\n');
  // TODO highlight LLM output with something like Prism.JS (maybe system emoj are enough ✅⚠️❌)
  display(outputContent);
  try {
    writeFileSync(filePath, outputContent);
    displaySuccess(`This report can be found in ${filePath}`);
  } catch (error) {
    displayDebug(error instanceof Error ? error : String(error));
    displayError(`Failed to write review to file: ${filePath}`);
    // Consider if you want to exit or just log the error
    // exit(1);
  }
}

export async function reviewInner(
  context: SlothContext,
  indicateProgress: ProgressCallback,
  preamble: string,
  diff: string
): Promise<string> {
  // This node receives the current state (messages) and invokes the LLM
  const callModel = async (state: State): Promise<{ messages: AIMessageChunk }> => {
    // state.messages will contain the list including the system preamble and user diff
    const response = await (context.config.llm as BaseChatModel).invoke(state.messages);
    // MessagesAnnotation expects the node to return the new message(s) to be added to the state.
    // Wrap the response in an array if it's a single message object.
    return { messages: response };
  };

  // Define the graph structure with MessagesAnnotation state
  const workflow = new StateGraph(MessagesAnnotation)
    // Define the node and edge
    .addNode('model', callModel)
    .addEdge(START, 'model') // Start at the 'model' node
    .addEdge('model', END); // End after the 'model' node completes

  // Set up memory (optional but good practice for potential future multi-turn interactions)
  const memory = new MemorySaver(); // TODO extract to config

  // Compile the workflow into a runnable app
  const app = workflow.compile({ checkpointer: memory });

  // Construct the initial the messages including the preamble as a system message
  const messages: Message[] = [new SystemMessage(preamble), new HumanMessage(diff)];

  indicateProgress();
  // TODO create proper progress indicator for async tasks.
  const progress = setInterval(() => indicateProgress(), 1000);
  const output = await app.invoke({ messages }, context.session);
  clearInterval(progress);
  const lastMessage = output.messages[output.messages.length - 1];
  return typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
}
