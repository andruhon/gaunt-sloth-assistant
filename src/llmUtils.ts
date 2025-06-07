import type { Message } from '#src/modules/types.js';
import { HumanMessage, isAIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SlothConfig } from '#src/config.js';
import type { Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { display, displayError, displayInfo, displayWarning } from '#src/consoleUtils.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getCurrentDir, stdout } from '#src/systemUtils.js';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ProgressIndicator } from '#src/utils.js';

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
  try {
    if (config.streamOutput && config.llm._llmType() === 'anthropic') {
      displayWarning('To avoid known bug with Anthropic forcing streamOutput to false');
      config.streamOutput = false;
    }
  } catch {}
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
    const output = { aiMessage: '' };
    if (!config.streamOutput) {
      const progress = new ProgressIndicator('Thinking.');
      try {
        const response = await agent.invoke({ messages });
        output.aiMessage = response.messages[response.messages.length - 1].content as string;
        const toolNames = response.messages
          .filter((msg: any) => msg.tool_calls && msg.tool_calls.length > 0)
          .flatMap((msg: any) => msg.tool_calls.map((tc: any) => tc.name));
        if (toolNames.length > 0) {
          displayInfo(`\nUsed tools: ${toolNames.join(', ')}`);
        }
      } catch (e) {
        displayWarning(`Something went wrong ${(e as Error).message}`);
      } finally {
        progress.stop();
      }
      display(output.aiMessage);
    } else {
      const stream = await agent.stream({ messages }, { streamMode: 'messages' });

      for await (const [chunk, _metadata] of stream) {
        if (isAIMessage(chunk)) {
          stdout.write(chunk.content as string, 'utf-8');
          output.aiMessage += chunk.content;
          let toolCalls = chunk.tool_calls;
          if (toolCalls && toolCalls.length > 0) {
            const suffix = toolCalls.length > 1 ? 's' : '';
            const toolCallsString = toolCalls.map((t) => t?.name).join(', ');
            displayInfo(`Using tool${suffix} ${toolCallsString}`);
          }
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
