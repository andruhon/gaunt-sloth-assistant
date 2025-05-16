import type { Message, State } from '#src/modules/types.js';
import { AIMessageChunk, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';

const llmGlobalSettings = {
  verbose: false,
};

export async function invoke(
  llm: BaseChatModel,
  options: Partial<BaseLanguageModelCallOptions>,
  systemMessage: string,
  prompt: string
): Promise<string> {
  if (llmGlobalSettings.verbose) {
    llm.verbose = true;
  }
  // This node receives the current state (messages) and invokes the LLM
  const callModel = async (state: State): Promise<{ messages: AIMessageChunk }> => {
    // state.messages will contain the list including the system systemMessage and user diff
    const response = await (llm as BaseChatModel).invoke(state.messages);
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
  const memory = new MemorySaver();

  // Compile the workflow into a runnable app
  const app = workflow.compile({ checkpointer: memory });

  // Construct the initial the messages including the systemMessage as a system message
  const messages: Message[] = [new SystemMessage(systemMessage), new HumanMessage(prompt)];

  const output = await app.invoke({ messages }, options);
  const lastMessage = output.messages[output.messages.length - 1];
  return typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
}

export function setVerbose(debug: boolean) {
  llmGlobalSettings.verbose = debug;
}
