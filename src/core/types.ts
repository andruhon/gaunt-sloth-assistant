import type { RunnableConfig } from '@langchain/core/runnables';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { SlothConfig } from '#src/config.js';
import { BaseCheckpointSaver } from '@langchain/langgraph';

export type StatusLevel = 'info' | 'warning' | 'error' | 'success' | 'debug' | 'display' | 'stream';
export type GthCommand = 'ask' | 'pr' | 'review' | 'chat' | 'code';

export interface GthAgentInterface {
  init(
    command: GthCommand | undefined,
    configIn: SlothConfig,
    checkpointSaver?: BaseCheckpointSaver | undefined
  ): Promise<void>;

  invoke(message: string, runConfig: RunnableConfig): Promise<string>;

  stream(message: string, runConfig: RunnableConfig): Promise<IterableReadableStream<string>>;
}
