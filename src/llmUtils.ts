import type { Message } from '#src/modules/types.js';
import { HumanMessage, isAIMessageChunk, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SlothConfig } from '#src/config.js';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { display, displayError, displayInfo } from '#src/consoleUtils.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { stdout, getCurrentDir } from '#src/systemUtils.js';
import type { Connection } from '@langchain/mcp-adapters';
import type { StructuredToolInterface } from '@langchain/core/tools';

const llmGlobalSettings = {
  verbose: false,
};

export async function invoke(
  llm: BaseChatModel,
  systemMessage: string,
  prompt: string,
  config: SlothConfig,
  command?: 'ask' | 'pr' | 'review'
): Promise<string> {
  if (llmGlobalSettings.verbose) {
    llm.verbose = true;
  }

  // Merge command-specific filesystem config if provided
  let effectiveConfig = config;
  if (command && config.commands?.[command]?.filesystem !== undefined) {
    effectiveConfig = {
      ...config,
      filesystem: config.commands[command].filesystem!,
    };
  }

  const client = getClient(effectiveConfig);

  const allTools = (await client?.getTools()) ?? [];
  const tools = filterTools(allTools, effectiveConfig.filesystem || 'none');

  if (allTools.length > 0) {
    displayInfo(`Loaded ${tools.length} tools.`);
  }

  // Create the React agent
  const agent = createReactAgent({
    llm,
    tools,
  });

  // Run the agent
  try {
    const messages: Message[] = [new SystemMessage(systemMessage), new HumanMessage(prompt)];
    display(`Connecting to LLM...`);
    const stream = await agent.stream({ messages }, { streamMode: 'messages' });

    const output = { aiMessage: '' };
    for await (const [chunk, _metadata] of stream) {
      if (isAIMessageChunk(chunk)) {
        if (config.streamOutput) {
          stdout.write(chunk.content as string, 'utf-8');
        }
        output.aiMessage += chunk.content;
        let toolCalls = chunk.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          const suffix = toolCalls.length > 1 ? 's' : '';
          const toolCallsString = toolCalls.map((t) => t?.name).join(', ');
          displayInfo(`Using tool${suffix} ${toolCallsString}`);
        }
      }
    }

    return output.aiMessage;
  } catch (error) {
    if (error instanceof Error) {
      if (error?.name === 'ToolException') {
        displayError(`Tool execution failed: ${error.message}`);
      }
    }
    throw error;
  } finally {
    if (client) {
      console.log('closing');
      await client.close();
    }
  }
}

export function setVerbose(debug: boolean) {
  llmGlobalSettings.verbose = debug;
}

function filterTools(
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

function getClient(config: SlothConfig) {
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
