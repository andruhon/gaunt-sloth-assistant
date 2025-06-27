import type { Message } from '#src/modules/types.js';
import { AIMessage, isAIMessage } from '@langchain/core/messages';
import { SlothConfig } from '#src/config.js';
import type { Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';
import { BaseToolkit, StructuredToolInterface } from '@langchain/core/tools';
import { ProgressIndicator } from '#src/utils.js';
import { type RunnableConfig } from '@langchain/core/runnables';
import { ToolCall } from '@langchain/core/messages/tool';
import { StatusLevel } from '#src/core/types.js';
import { getCurrentDir } from '#src/systemUtils.js';
import GthFileSystemToolkit from '#src/tools/GthFileSystemToolkit.js';

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

    // Get default tools and combine with config tools
    const defaultTools = this.getDefaultTools();
    const configTools = effectiveConfig.tools || [];

    // Flatten any toolkits into individual tools
    const flattenedConfigTools: StructuredToolInterface[] = [];
    for (const toolOrToolkit of [...defaultTools, ...configTools]) {
      // eslint-disable-next-line
      if ((toolOrToolkit as any)['getTools'] instanceof Function) {
        // This is a toolkit
        flattenedConfigTools.push(...(toolOrToolkit as BaseToolkit).getTools());
      } else {
        // This is a regular tool
        flattenedConfigTools.push(toolOrToolkit as StructuredToolInterface);
      }
    }

    // Then add tools from MCP server
    const mcpTools = (await this.mcpClient?.getTools()) ?? [];
    const allTools = [...flattenedConfigTools, ...mcpTools];

    // Then filter them
    const tools = this.filterTools(allTools, effectiveConfig.filesystem || 'none');

    if (tools.length > 0) {
      const toolNames = tools
        .map((tool) => tool.name)
        .filter((name) => name)
        .join(', ');
      this.statusUpdate('info', `Loaded tools: ${toolNames}`);
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
      this.statusUpdate('stream', `Thinking`);
      const output = { aiMessage: '' };
      if (!this.config.streamOutput) {
        const progress = new ProgressIndicator('.');
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

  protected filterTools(
    tools: StructuredToolInterface[],
    filesystemConfig: string[] | 'all' | 'none'
  ) {
    if (filesystemConfig === 'all') {
      return tools;
    }

    if (filesystemConfig === 'none') {
      // Filter out all filesystem tools (local only, since MCP filesystem is removed)
      return tools.filter((tool) => tool.name && !this.isFilesystemTool(tool.name));
    }

    if (!Array.isArray(filesystemConfig)) {
      return tools;
    }

    // Create set of allowed local filesystem tool names
    const allowedLocalToolNames = new Set(filesystemConfig);

    return tools.filter((tool) => {
      // Skip tools without names
      if (!tool.name) {
        return false;
      }

      // Allow non-filesystem tools
      if (!this.isFilesystemTool(tool.name)) {
        return true;
      }

      // Allow only specifically allowed filesystem tools
      return allowedLocalToolNames.has(tool.name);
    });
  }

  private isFilesystemTool(toolName: string): boolean {
    const filesystemToolNames = [
      'read_file',
      'read_multiple_files',
      'write_file',
      'edit_file',
      'create_directory',
      'list_directory',
      'list_directory_with_sizes',
      'directory_tree',
      'move_file',
      'search_files',
      'get_file_info',
      'list_allowed_directories',
    ];
    return filesystemToolNames.includes(toolName);
  }

  protected getDefaultTools(): (StructuredToolInterface | BaseToolkit)[] {
    return [new GthFileSystemToolkit([getCurrentDir()])];
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
