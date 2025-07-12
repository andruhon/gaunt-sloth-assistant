import type { Message } from '#src/modules/types.js';
import { GthConfig } from '#src/config.js';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { GthAgentInterface, GthCommand } from '#src/core/types.js';
import { GthLangChainAgent, StatusUpdateCallback } from '#src/core/GthLangChainAgent.js';
import { RunnableConfig } from '@langchain/core/runnables';
import { executeHooks } from '#src/utils.js';
import { getNewRunnableConfig } from '#src/llmUtils.js';

/**
 * Agent simplifies interaction with LLM and reduces it to calling a few methods
 * {@link #init} and {@link #processMessages}.
 */
export class GthAgentRunner {
  private statusUpdate: StatusUpdateCallback;
  private verbose: boolean = false;
  private agent: GthAgentInterface | null = null;
  private config: GthConfig | null = null;
  private runConfig: RunnableConfig | null = null;

  constructor(statusUpdate: StatusUpdateCallback) {
    this.statusUpdate = statusUpdate;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Init is split into a separate method. This may create a number of connections,
   * and we'd better have an instance by that moment, for the case things will go wrong,
   * so we can wrap init into try-catch and then call {@link #cleanup} within finally.
   */
  async init(
    command: GthCommand | undefined,
    configIn: GthConfig,
    checkpointSaver?: BaseCheckpointSaver | undefined
  ): Promise<void> {
    this.config = configIn;

    this.runConfig = this.config.hooks?.createRunnableConfig
      ? await this.config.hooks.createRunnableConfig(this.config)
      : getNewRunnableConfig();

    this.agent = this.config.hooks?.createAgent
      ? await this.config.hooks?.createAgent(this.config)
      : new GthLangChainAgent(this.statusUpdate);

    // Set verbose mode before initialization so it can be used during init
    if (this.verbose) {
      this.agent.setVerbose(this.verbose);
    }

    // Call before init hook
    await executeHooks(this.config.hooks?.beforeAgentInit, this);

    // Initialize the agent
    await this.agent.init(command, configIn, checkpointSaver);

    // Call after init hook
    await executeHooks(this.config.hooks?.afterAgentInit, this);
  }

  /**
   * processMessages deals with both streaming and non-streaming approaches.
   */
  async processMessages(messages: Message[]): Promise<string> {
    if (!this.agent || !this.config || !this.runConfig) {
      throw new Error('AgentRunner not initialized. Call init() first.');
    }

    await executeHooks(this.config.hooks?.beforeProcessMessages, this, messages, this.runConfig);

    try {
      // Decision: Use streaming or non-streaming based on config
      if (this.config.streamOutput) {
        // Use streaming
        const stream = await this.agent.stream(messages, this.runConfig);
        let result = '';
        try {
          for await (const chunk of stream) {
            result += chunk;
          }
        } catch (streamError) {
          // Handle streaming-specific errors
          throw new Error(
            `Stream processing failed: ${streamError instanceof Error ? streamError.message : String(streamError)}`
          );
        }
        return result;
      } else {
        // Use non-streaming
        return await this.agent.invoke(messages, this.runConfig);
      }
    } catch (error) {
      // Handle agent invocation errors
      throw new Error(
        `Agent processing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // noinspection JSUnusedGlobalSymbols
  public getAgent(): GthAgentInterface | null {
    return this.agent;
  }

  async cleanup(): Promise<void> {
    if (this.agent && 'cleanup' in this.agent && typeof this.agent.cleanup === 'function') {
      await this.agent.cleanup();
    }
    this.agent = null;
    this.config = null;
  }
}
