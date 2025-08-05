import { RunnableConfig } from '@langchain/core/runnables';
import { randomUUID } from 'node:crypto';

/**
 * Creates new runnable config.
 * configurable.thread_id is an important part of that because it helps to distinguish different chat sessions.
 * We normally do not have multiple sessions in the terminal, but I had bad stuff happening in tests
 * and in another prototype project where I was importing Gaunt Sloth.
 */
export function getNewRunnableConfig(): RunnableConfig {
  return {
    recursionLimit: 250,
    configurable: { thread_id: randomUUID() },
  };
}
