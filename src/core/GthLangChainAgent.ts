import { AIMessage, isAIMessage } from '@langchain/core/messages';
import { SlothConfig } from '#src/config.js';
import type { Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient, StreamableHTTPConnection } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';
import { formatToolCalls, ProgressIndicator } from '#src/utils.js';
import { ToolCall } from '@langchain/core/messages/tool';
import { GthAgentInterface, GthCommand, StatusLevel } from '#src/core/types.js';
import { BaseToolkit, StructuredToolInterface } from '@langchain/core/tools';
import { getDefaultTools } from '#src/builtInToolsConfig.js';
import { createAuthProviderAndAuthenticate } from '#src/mcp/OAuthClientProviderImpl.js';
import { displayInfo } from '#src/consoleUtils.js';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { RunnableConfig } from '@langchain/core/runnables';

export type StatusUpdateCallback = (level: StatusLevel, message: string) => void;

export class GthLangChainAgent implements GthAgentInterface {
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
    configIn: SlothConfig,
    checkpointSaver?: BaseCheckpointSaver | undefined
  ): Promise<void> {
    if (this.verbose) {
      configIn.llm.verbose = true;
    }

    // Merge command-specific filesystem config if provided
    this.config = this.getEffectiveConfig(configIn, command);
    this.mcpClient = await this.getMcpClient(this.config);

    // Get default filesystem tools (filtered based on config)
    const defaultTools = await getDefaultTools(this.config);

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

  /**
   * Invoke LLM with a message and runnable config.
   * For streaming use {@link #stream} method, streaming is preferred if model API supports it.
   * Please note that this when tools are involved, this method will anyway do multiple LLM
   * calls within LangChain dependency.
   */
  async invoke(message: string, runConfig: RunnableConfig): Promise<string> {
    if (!this.agent || !this.config) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    // Convert string to Message format expected by the agent
    const messages = [{ role: 'user', content: message }];

    try {
      const progress = new ProgressIndicator('Thinking.');
      try {
        const response = await this.agent.invoke({ messages }, runConfig);
        const aiMessage = response.messages[response.messages.length - 1].content as string;
        const toolCalls = response.messages
          .filter((msg: AIMessage) => msg.tool_calls && msg.tool_calls.length > 0)
          .flatMap((msg: AIMessage) => msg.tool_calls ?? [])
          .filter((tc: ToolCall) => tc.name);
        if (toolCalls.length > 0) {
          this.statusUpdate('info', `\nUsed tools: ${formatToolCalls(toolCalls)}`);
        }
        this.statusUpdate('display', aiMessage);
        return aiMessage;
      } catch (e) {
        if (e instanceof Error && e?.name === 'ToolException') {
          throw e; // Re-throw ToolException to be handled by outer catch
        }
        this.statusUpdate('warning', `Something went wrong ${(e as Error).message}`);
        return '';
      } finally {
        progress.stop();
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error?.name === 'ToolException') {
          this.statusUpdate('error', `Tool execution failed: ${error?.message}`);
          return `Tool execution failed: ${error?.message}`;
        }
      }
      throw error;
    }
  }

  /**
   * Induce LLM to stream AI messages with a user message and runnable config.
   * When stream is not appropriate use {@link invoke}.
   */
  async stream(
    message: string,
    runConfig: RunnableConfig
  ): Promise<IterableReadableStream<string>> {
    if (!this.agent || !this.config) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    // Convert string to Message format expected by the agent
    const messages = [{ role: 'user', content: message }];

    this.statusUpdate('info', '\nThinking...\n');
    const stream = await this.agent.stream({ messages }, { ...runConfig, streamMode: 'messages' });

    const statusUpdate = this.statusUpdate;
    return new IterableReadableStream({
      async start(controller) {
        try {
          for await (const [chunk, _metadata] of stream) {
            if (isAIMessage(chunk)) {
              const text = chunk.text as string;
              statusUpdate('stream', text);
              controller.enqueue(text);
              const toolCalls = chunk.tool_calls?.filter((tc) => tc.name);
              if (toolCalls && toolCalls.length > 0) {
                statusUpdate('info', `\nUsed tools: ${formatToolCalls(toolCalls)}`);
              }
            }
          }
          controller.close();
        } catch (error) {
          if (error instanceof Error) {
            if (error?.name === 'ToolException') {
              statusUpdate('error', `Tool execution failed: ${error?.message}`);
            }
          }
          controller.error(error);
        }
      },
    });
  }

  async cleanup(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.close();
      this.mcpClient = null;
    }
    this.agent = null;
    this.config = null;
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

  protected async getMcpClient(config: SlothConfig) {
    const defaultServers = this.getDefaultMcpServers();

    // Merge with user's mcpServers
    const rawMcpServers = { ...defaultServers, ...(config.mcpServers || {}) };

    const mcpServers = {} as Record<string, StreamableHTTPConnection>;
    for (const serverName of Object.keys(rawMcpServers)) {
      const server = rawMcpServers[serverName] as StreamableHTTPConnection;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (server.url && server && (server.authProvider as any) === 'OAuth') {
        displayInfo(`Starting OAuth for for ${server.url}`);
        const authProvider = await createAuthProviderAndAuthenticate(server);
        mcpServers[serverName] = {
          ...server,
          authProvider,
        };
      } else {
        // Add non-OAuth servers as-is
        mcpServers[serverName] = server;
      }
    }

    if (Object.keys(mcpServers).length > 0) {
      return new MultiServerMCPClient({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: mcpServers,
      });
    } else {
      return null;
    }
  }
}
