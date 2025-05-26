import type { Message } from '#src/modules/types.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { slothContext } from '#src/config.js';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { displayError, displayInfo } from '#src/consoleUtils.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const llmGlobalSettings = {
  verbose: false,
};

export async function invoke(
  llm: BaseChatModel,
  systemMessage: string,
  prompt: string
): Promise<string> {
  if (llmGlobalSettings.verbose) {
    llm.verbose = true;
  }

  const client = getClient();

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
    const stream = await agent.stream({ messages }, { streamMode: 'values' });

    const output = { aiMessage: '' };
    for await (const chunk of stream) {
      if (chunk.messages && chunk.messages.length > 0) {
        const lastMessage = chunk.messages[chunk.messages.length - 1];
        if (lastMessage && lastMessage.constructor.name === 'ToolMessage') {
          displayInfo(`Using tool ${lastMessage?.name}`);
        }
        if (lastMessage && lastMessage.constructor.name === 'AIMessageChunk') {
          output.aiMessage += '\n\n' + lastMessage.content;
        }
      }
    }
    return output.aiMessage;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'ToolException') {
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

function getClient() {
  if (slothContext.config.mcpServers && Object.keys(slothContext.config.mcpServers).length > 0) {
    return new MultiServerMCPClient({
      throwOnLoadError: true,
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: 'mcp',
      mcpServers: slothContext.config.mcpServers,
    });
  } else {
    return null;
  }
}
