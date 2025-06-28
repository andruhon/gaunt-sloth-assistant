import type { Message } from '#src/modules/types.js';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';

export interface AgentTool {
  name: string;
  description: string;
  parameters?: object;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callTool?: (args: any) => Promise<any>;
}

export interface AgentStreamChunk {
  type: 'text' | 'tool_call' | 'tool_result';
  content: string;
  toolCalls?: AgentTool[];
}

export interface AgentResponse {
  content: string;
  toolCalls?: AgentTool[];
}

export interface GenericAgent {
  /**
   * Initialize the agent with tools and configuration
   */
  init(tools: StructuredToolInterface[], config?: RunnableConfig): Promise<void>;

  /**
   * Invoke the agent with messages and return the complete response
   */
  invoke(messages: Message[], config?: RunnableConfig): Promise<AgentResponse>;

  /**
   * Stream the agent response
   */
  stream(messages: Message[], config?: RunnableConfig): AsyncGenerator<AgentStreamChunk>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}
