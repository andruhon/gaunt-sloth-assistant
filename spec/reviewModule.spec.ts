import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { SlothContext } from '#src/config.js';

describe('reviewModule', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it('should invoke LLM (internal)', async () => {
    // Setup mock for slothContext
    const testContext = {
      config: {
        llm: new FakeListChatModel({
          responses: ['First LLM message', 'Second LLM message'],
        }),
      },
      session: {
        configurable: {
          thread_id: 'test-thread-id',
        },
      },
    } as SlothContext;

    // Import the module after setting up mocks
    const { reviewInner } = await import('#src/modules/reviewModule.js');

    // Test the function
    const output = await reviewInner(testContext, () => {}, 'test-preamble', 'test-diff');

    expect(output).toBe('First LLM message');
  });
});
