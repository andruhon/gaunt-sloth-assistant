import type { Message } from '#src/modules/types.js';
import { AIMessage, isAIMessage } from '@langchain/core/messages';
import { SlothConfig } from '#src/config.js';
import type { Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';
import { formatToolCalls, ProgressIndicator } from '#src/utils.js';
import { type RunnableConfig } from '@langchain/core/runnables';
import { ToolCall } from '@langchain/core/messages/tool';
import { GthCommand, StatusLevel } from '#src/core/types.js';
import { BaseToolkit, StructuredToolInterface } from '@langchain/core/tools';
import { getDefaultTools } from '#src/builtInToolsConfig.js';

export type StatusUpdateCallback = (level: StatusLevel, message: string) => void;

export class Invocation {
  private statusUpdate: StatusUpdateCallback;
  private verbose: boolean = false;
  private mcpClient: MultiServerMCPClient | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agent: CompiledStateGraph<any, any> | null = null;
  private config: SlothConfig | null = null;

  constructor(statusUpdate: StatusUpdateCallback) {
    this.statusUpdate = statusUpdate;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  async init(
    command: GthCommand | undefined,
    config: SlothConfig,
    checkpointSaver?: BaseCheckpointSaver | undefined
  ): Promise<void> {
    if (this.verbose) {
      config.llm.verbose = true;
    }

    // Merge command-specific filesystem config if provided
    this.config = this.getEffectiveConfig(config, command);
    this.mcpClient = this.getMcpClient(this.config);

    // Get default filesystem tools (filtered based on config)
    const defaultTools = await getDefaultTools(config);

    // Get user config tools
    const flattenedConfigTools = this.extractAndFlattenTools(this.config.tools || []);

    // Get MCP tools
    const mcpTools = (await this.mcpClient?.getTools()) ?? [];

    // Combine all tools
    const tools = [...defaultTools, ...flattenedConfigTools, ...mcpTools];

    if (tools.length > 0) {
      const toolNames = tools
        .map((tool) => tool.name)
        .filter((name) => name)
        .join(', ');
      this.statusUpdate('info', `Loaded tools: ${toolNames}`);
    }

    // Create the React agent
    this.agent = createReactAgent({
      llm: this.config.llm,
      tools,
      checkpointSaver,
    });
  }

  getEffectiveConfig(config: SlothConfig, command: GthCommand | undefined): SlothConfig {
    const supportsTools = !!config.llm.bindTools;
    if (!supportsTools) {
      this.statusUpdate('warning', 'Model does not seem to support tools.');
    }
    return {
      ...config,
      filesystem:
        command && config.commands?.[command]?.filesystem !== undefined
          ? config.commands[command].filesystem!
          : config.filesystem,
      builtInTools:
        command && config.commands?.[command]?.builtInTools !== undefined
          ? config.commands[command].builtInTools!
          : config.builtInTools,
    };
  }

  async invoke(messages: Message[], runConfig?: RunnableConfig): Promise<string> {
    if (!this.agent || !this.config) {
      throw new Error('Invocation not initialized. Call init() first.');
    }

    // Run the agent
    try {
      const output = { aiMessage: '' };
      if (this.config.streamOutput) {
        // Streaming output
        this.statusUpdate('info', '\nThinking...\n');
        const stream = await this.agent.stream(
          { messages },
          { ...runConfig, streamMode: 'messages' }
        );

        for await (const [chunk, _metadata] of stream) {
          if (isAIMessage(chunk)) {
            this.statusUpdate('stream', chunk.text as string);
            output.aiMessage += chunk.text;
            const toolCalls = chunk.tool_calls?.filter((tc) => tc.name);
            if (toolCalls && toolCalls.length > 0) {
              this.statusUpdate('info', `\nUsed tools: ${formatToolCalls(toolCalls)}`);
            }
          }
        }
      } else {
        // Not streaming output
        const progress = new ProgressIndicator('Thinking.');
        try {
          const response = await this.agent.invoke({ messages }, runConfig);
          output.aiMessage = response.messages[response.messages.length - 1].content as string;
          const toolCalls = response.messages
            .filter((msg: AIMessage) => msg.tool_calls && msg.tool_calls.length > 0)
            .flatMap((msg: AIMessage) => msg.tool_calls ?? [])
            .filter((tc: ToolCall) => tc.name);
          if (toolCalls.length > 0) {
            this.statusUpdate('info', `\nUsed tools: ${formatToolCalls(toolCalls)}`);
          }
        } catch (e) {
          this.statusUpdate('warning', `Something went wrong ${(e as Error).message}`);
        } finally {
          progress.stop();
        }
        this.statusUpdate('display', output.aiMessage);
      }

      return output.aiMessage;
    } catch (error) {
      if (error instanceof Error) {
        if (error?.name === 'ToolException') {
          this.statusUpdate('error', `Tool execution failed: ${error?.message}`);
        }
      }
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.close();
      this.mcpClient = null;
    }
    this.agent = null;
    this.config = null;
  }

  /**
   * Extract and flatten tools from toolkits
   */
  private extractAndFlattenTools(
    tools: (StructuredToolInterface | BaseToolkit)[]
  ): StructuredToolInterface[] {
    const flattenedTools: StructuredToolInterface[] = [];
    for (const toolOrToolkit of tools) {
      // eslint-disable-next-line
      if ((toolOrToolkit as any)['getTools'] instanceof Function) {
        // This is a toolkit
        flattenedTools.push(...(toolOrToolkit as BaseToolkit).getTools());
      } else {
        // This is a regular tool
        flattenedTools.push(toolOrToolkit as StructuredToolInterface);
      }
    }
    return flattenedTools;
  }

  protected getDefaultMcpServers(): Record<string, Connection> {
    return {};
  }

  protected getMcpClient(config: SlothConfig) {
    const defaultServers = this.getDefaultMcpServers();

    // Merge with user's mcpServers
    const mcpServers = { ...defaultServers, ...(config.mcpServers || {}) };

    // If user provided their own filesystem config, it overrides default
    if (config.mcpServers?.filesystem) {
      mcpServers.filesystem = config.mcpServers.filesystem;
    }

    if (Object.keys(mcpServers).length > 0) {
      return new MultiServerMCPClient({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers,
      });
    } else {
      return null;
    }
  }
}
