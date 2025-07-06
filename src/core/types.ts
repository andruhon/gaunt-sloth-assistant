import type { RunnableConfig } from '@langchain/core/runnables';
import { IterableReadableStream } from '@langchain/core/utils/stream';

export type StatusLevel = 'info' | 'warning' | 'error' | 'success' | 'debug' | 'display' | 'stream';
export type GthCommand = 'ask' | 'pr' | 'review' | 'chat' | 'code';
export type GthRunConfig = {
  command?: GthCommand;
  sessionId?: string;
  recursionLimit?: number;
  runnableConfig?: RunnableConfig;
};

export interface GthAgentInterface {
  invoke(message: string, runConfig: GthRunConfig): Promise<string>;
  stream(message: string, runConfig: GthRunConfig): Promise<IterableReadableStream<string>>;
}
