import type { Message } from '#src/modules/types.js';
import { SlothConfig } from '#src/config.js';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { type RunnableConfig } from '@langchain/core/runnables';
import { GthAgentInterface, GthCommand, GthRunConfig } from '#src/core/types.js';
import { GthLangChainAgent, StatusUpdateCallback } from '#src/core/GthLangChainAgent.js';

export class GthAgentRunner {
  private statusUpdate: StatusUpdateCallback;
  private verbose: boolean = false;
  private agent: GthAgentInterface | null = null;
  private config: SlothConfig | null = null;

  constructor(statusUpdate: StatusUpdateCallback, agent?: GthAgentInterface) {
    this.statusUpdate = statusUpdate;
    this.agent = agent || null;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  async init(
    command: GthCommand | undefined,
    configIn: SlothConfig,
    checkpointSaver?: BaseCheckpointSaver | undefined
  ): Promise<void> {
    this.config = configIn;

    // Create default agent if none provided
    if (!this.agent) {
      this.agent = new GthLangChainAgent(this.statusUpdate);
    }

    // Initialize the agent if it has an init method
    if ('init' in this.agent && typeof this.agent.init === 'function') {
      await this.agent.init(command, configIn, checkpointSaver);
    }

    // Set verbose if applicable
    if (this.verbose && 'setVerbose' in this.agent && typeof this.agent.setVerbose === 'function') {
      this.agent.setVerbose(this.verbose);
    }
  }

  async processMessages(messages: Message[], runConfig?: RunnableConfig): Promise<string> {
    if (!this.agent || !this.config) {
      throw new Error('Invocation not initialized. Call init() first.');
    }

    // Convert Message[] to a single string for the agent interface
    const message = messages.map((msg) => msg.content).join('\n');

    const gthRunConfig: GthRunConfig = {
      runnableConfig: runConfig,
    };

    return await this.agent.invoke(message, gthRunConfig);
  }

  async cleanup(): Promise<void> {
    if (this.agent && 'cleanup' in this.agent && typeof this.agent.cleanup === 'function') {
      await this.agent.cleanup();
    }
    this.agent = null;
    this.config = null;
  }
}
