import type { Message } from '#src/modules/types.js';
import { AIMessage, isAIMessage } from '@langchain/core/messages';
import { SlothConfig } from '#src/config.js';
import type { Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';
import { getCurrentDir } from '#src/systemUtils.js';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ProgressIndicator } from '#src/utils.js';
import { type RunnableConfig } from '@langchain/core/runnables';
import { ToolCall } from '@langchain/core/messages/tool';

export type StatusLevel = 'info' | 'warning' | 'error' | 'success' | 'debug' | 'display' | 'stream';

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
    command: 'ask' | 'pr' | 'review' | 'chat' | 'code' | undefined,
    config: SlothConfig,
    checkpointSaver?: BaseCheckpointSaver | undefined
  ): Promise<void> {
    try {
      if (config.streamOutput && config.llm._llmType() === 'anthropic') {
        this.statusUpdate(
          'warning',
          'To avoid known bug with Anthropic forcing streamOutput to false'
        );
        config.streamOutput = false;
      }
    } catch {}

    if (this.verbose) {
      config.llm.verbose = true;
    }

    // Merge command-specific filesystem config if provided
    let effectiveConfig = config;
    if (command && config.commands?.[command]?.filesystem !== undefined) {
      effectiveConfig = {
        ...config,
        filesystem: config.commands[command].filesystem!,
      };
    }

    this.config = effectiveConfig;
    this.mcpClient = this.getMcpClient(effectiveConfig);

    const allTools = (await this.mcpClient?.getTools()) ?? [];
    const tools = this.filterTools(allTools, effectiveConfig.filesystem || 'none');

    if (allTools.length > 0) {
      this.statusUpdate('info', `Loaded ${tools.length} tools.`);
    }

    // Create the React agent
    this.agent = createReactAgent({
      llm: config.llm,
      tools,
      checkpointSaver,
    });
  }

  async invoke(messages: Message[], runConfig?: RunnableConfig): Promise<string> {
    if (!this.agent || !this.config) {
      throw new Error('Invocation not initialized. Call init() first.');
    }

    // Run the agent
    try {
      this.statusUpdate('display', `Connecting to LLM...`);
      const output = { aiMessage: '' };
      if (!this.config.streamOutput) {
        const progress = new ProgressIndicator('Thinking.');
        try {
          const response = await this.agent.invoke({ messages }, runConfig);
          output.aiMessage = response.messages[response.messages.length - 1].content as string;
          const toolNames =
            response.messages
              .filter((msg: AIMessage) => msg.tool_calls && msg.tool_calls.length > 0)
              .flatMap((msg: AIMessage) => msg.tool_calls?.map((tc: ToolCall) => tc.name)) ?? [];
          if (toolNames.length > 0) {
            this.statusUpdate('info', `\nUsed tools: ${toolNames.join(', ')}`);
          }
        } catch (e) {
          this.statusUpdate('warning', `Something went wrong ${(e as Error).message}`);
        } finally {
          progress.stop();
        }
        this.statusUpdate('display', output.aiMessage);
      } else {
        const stream = await this.agent.stream(
          { messages },
          { ...runConfig, streamMode: 'messages' }
        );

        for await (const [chunk, _metadata] of stream) {
          if (isAIMessage(chunk)) {
            this.statusUpdate('stream', chunk.content as string);
            output.aiMessage += chunk.content;
            let toolCalls = chunk.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
              const suffix = toolCalls.length > 1 ? 's' : '';
              const toolCallsString = toolCalls.map((t) => t?.name).join(', ');
              this.statusUpdate('info', `Using tool${suffix} ${toolCallsString}`);
            }
          }
        }
      }

      return output.aiMessage;
    } catch (error) {
      if (error instanceof Error) {
        if (error?.name === 'ToolException') {
          this.statusUpdate('error', `Tool execution failed: ${error.message}`);
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

  protected filterTools(
    tools: StructuredToolInterface[],
    filesystemConfig: string[] | 'all' | 'none'
  ) {
    if (filesystemConfig === 'all' || !Array.isArray(filesystemConfig)) {
      return tools;
    }

    // Create set of allowed tool names with mcp__filesystem__ prefix
    const allowedToolNames = new Set(
      filesystemConfig.map((shortName) => `mcp__filesystem__${shortName}`)
    );

    return tools.filter((tool) => {
      // Allow non-filesystem tools and only allowed filesystem tools
      return !tool.name.startsWith('mcp__filesystem__') || allowedToolNames.has(tool.name);
    });
  }

  protected getMcpClient(config: SlothConfig) {
    const defaultServers: Record<string, Connection> = {};

    // Add filesystem server if configured
    if (config.filesystem && config.filesystem !== 'none') {
      const filesystemConfig: Connection = {
        transport: 'stdio' as const,
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', getCurrentDir()],
      };

      defaultServers.filesystem = filesystemConfig;
    }

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
