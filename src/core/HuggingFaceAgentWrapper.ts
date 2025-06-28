import type { Message } from '#src/modules/types.js';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - No types available for @huggingface/tiny-agents
import { Agent } from '@huggingface/tiny-agents';
import type { GenericAgent, AgentResponse, AgentStreamChunk, AgentTool } from './AgentInterface.js';

export interface HuggingFaceAgentConfig {
  provider?: string;
  model: string;
  apiKey: string;
}

export class HuggingFaceAgentWrapper implements GenericAgent {
  private agent: Agent | null = null;
  private config: HuggingFaceAgentConfig;

  constructor(config: HuggingFaceAgentConfig) {
    this.config = config;
  }

  async init(tools: StructuredToolInterface[], _config?: RunnableConfig): Promise<void> {
    this.agent = new Agent({
      provider: this.config.provider || 'auto',
      model: this.config.model,
      apiKey: this.config.apiKey,
    });

    // Convert LangChain tools to HuggingFace format
    // for (const tool of tools) {
    //   this.agent.availableTools.push({
    //     type: 'function',
    //     function: {
    //       name: tool.name,
    //       description: tool.description,
    //       parameters: this.convertLangChainSchemaToJsonSchema(tool.schema),
    //     },
    //   });
    //
    //   // Set up tool client
    //   this.agent.clients.set(tool.name, {
    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     callTool: async (opts: any) => {
    //       try {
    //         const result = await tool.call(opts.arguments);
    //         return {
    //           content: [
    //             {
    //               type: 'text',
    //               text: typeof result === 'string' ? result : JSON.stringify(result),
    //             },
    //           ],
    //         };
    //       } catch (error) {
    //         return {
    //           content: [
    //             {
    //               type: 'text',
    //               text: `Error calling tool ${tool.name}: ${(error as Error).message}`,
    //             },
    //           ],
    //         };
    //       }
    //     },
    //   });
    // }
  }

  async invoke(messages: Message[], _config?: RunnableConfig): Promise<AgentResponse> {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    // Convert messages to a single prompt string
    const prompt = this.convertMessagesToPrompt(messages);

    let content = '';
    const toolCalls: AgentTool[] = [];

    for await (const chunk of this.agent.run(prompt)) {
      if ('choices' in chunk) {
        const delta = chunk.choices[0]?.delta;
        if (delta.content) {
          content += delta.content;
        }

        // Check for tool calls in the response
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function) {
              toolCalls.push({
                name: toolCall.function.name,
                description: '',
                parameters: JSON.parse(toolCall.function.arguments || '{}'),
              });
            }
          }
        }
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  async *stream(messages: Message[], _config?: RunnableConfig): AsyncGenerator<AgentStreamChunk> {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    // Convert messages to a single prompt string
    const prompt = this.convertMessagesToPrompt(messages);

    for await (const chunk of this.agent.run(prompt)) {
      if ('choices' in chunk) {
        const delta = chunk.choices[0]?.delta;
        if (delta.content) {
          yield {
            type: 'text',
            content: delta.content,
          };
        }

        // Check for tool calls in the response
        if (delta.tool_calls) {
          const toolCalls: AgentTool[] = [];
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function) {
              toolCalls.push({
                name: toolCall.function.name,
                description: '',
                parameters: JSON.parse(toolCall.function.arguments || '{}'),
              });
            }
          }

          if (toolCalls.length > 0) {
            yield {
              type: 'tool_call',
              content: '',
              toolCalls,
            };
          }
        }
      }
    }
  }

  async cleanup(): Promise<void> {
    this.agent = null;
  }

  private convertMessagesToPrompt(messages: Message[]): string {
    // Simple conversion - in a real implementation you might want more sophisticated handling
    return messages
      .map((msg) => {
        if (typeof msg === 'string') return msg;
        if (msg.content)
          return typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return JSON.stringify(msg);
      })
      .join('\n');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertLangChainSchemaToJsonSchema(schema: any): any {
    // Simple conversion - LangChain tools should already have JSON schema compatible format
    // This might need more sophisticated handling depending on the actual schema structure
    return schema;
  }
}
