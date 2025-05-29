import type { Message } from '#src/modules/types.js';
import { HumanMessage, isAIMessageChunk, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SlothConfig } from '#src/config.js';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { displayError, displayInfo } from '#src/consoleUtils.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { stdout } from '#src/systemUtils.js';

const llmGlobalSettings = {
  verbose: false,
};

export async function invoke(
  llm: BaseChatModel,
  systemMessage: string,
  prompt: string,
  config: SlothConfig
): Promise<string> {
  if (llmGlobalSettings.verbose) {
    llm.verbose = true;
  }

  const client = getClient(config);

  const tools = (await client?.getTools()) ?? [];
  if (tools && tools.length > 0) {
    displayInfo(`Loaded ${tools.length} MCP tools.`);
  }

  // Create the React agent
  const agent = createReactAgent({
    llm,
    tools,
  });

  // Run the agent
  try {
    const messages: Message[] = [new SystemMessage(systemMessage), new HumanMessage(prompt)];
    // const response = await agent.invoke({
    //   messages,
    // });
    const stream = await agent.stream({ messages }, { streamMode: 'messages' });

    const output = { aiMessage: '' };
    for await (const [chunk, _metadata] of stream) {
      if (isAIMessageChunk(chunk)) {
        if (config.streamOutput) {
          stdout.write(chunk.content as string);
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

function getClient(config: SlothConfig) {
  if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
    return new MultiServerMCPClient({
      throwOnLoadError: true,
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: 'mcp',
      mcpServers: config.mcpServers,
    });
  } else {
    return null;
  }
}
