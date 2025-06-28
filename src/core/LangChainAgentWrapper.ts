import type { Message } from '#src/modules/types.js';
import { AIMessage, isAIMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';
import { ToolCall } from '@langchain/core/messages/tool';
import type { GenericAgent, AgentResponse, AgentStreamChunk, AgentTool } from './AgentInterface.js';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export class LangChainAgentWrapper implements GenericAgent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agent: CompiledStateGraph<any, any> | null = null;
  private llm: BaseChatModel;
  private checkpointSaver?: BaseCheckpointSaver;

  constructor(llm: BaseChatModel, checkpointSaver?: BaseCheckpointSaver) {
    this.llm = llm;
    this.checkpointSaver = checkpointSaver;
  }

  async init(tools: StructuredToolInterface[], _config?: RunnableConfig): Promise<void> {
    this.agent = createReactAgent({
      llm: this.llm,
      tools,
      checkpointSaver: this.checkpointSaver,
    });
  }

  async invoke(messages: Message[], config?: RunnableConfig): Promise<AgentResponse> {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    const response = await this.agent.invoke({ messages }, config);
    const lastMessage = response.messages[response.messages.length - 1];

    const toolCalls = response.messages
      .filter((msg: AIMessage) => msg.tool_calls && msg.tool_calls.length > 0)
      .flatMap((msg: AIMessage) => msg.tool_calls ?? [])
      .filter((tc: ToolCall) => tc.name)
      .map((tc: ToolCall) => this.convertToAgentTool(tc));

    return {
      content: lastMessage.content as string,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  async *stream(messages: Message[], config?: RunnableConfig): AsyncGenerator<AgentStreamChunk> {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    const stream = await this.agent.stream({ messages }, { ...config, streamMode: 'messages' });

    for await (const [chunk, _metadata] of stream) {
      if (isAIMessage(chunk)) {
        if (chunk.text) {
          yield {
            type: 'text',
            content: chunk.text as string,
          };
        }

        const toolCalls = chunk.tool_calls?.filter((tc) => tc.name);
        if (toolCalls && toolCalls.length > 0) {
          yield {
            type: 'tool_call',
            content: '',
            toolCalls: toolCalls.map((tc) => this.convertToAgentTool(tc)),
          };
        }
      }
    }
  }

  async cleanup(): Promise<void> {
    this.agent = null;
  }

  private convertToAgentTool(toolCall: ToolCall): AgentTool {
    return {
      name: toolCall.name,
      description: '', // LangChain ToolCall doesn't include description
      parameters: toolCall.args,
    };
  }
}
