import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeListChatModel } from '@langchain/core/utils/testing';

describe('reviewModule', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it('should invoke LLM (internal)', async () => {
    // Setup mock for slothContext
    const fakeListChatModel = new FakeListChatModel({
      responses: ['First LLM message', 'Second LLM message'],
    });
    const options = {
      configurable: {
        thread_id: 'test-thread-id',
      },
    };

    // Import the module after setting up mocks
    const { invoke } = await import('#src/llmUtils.js');

    // Test the function
    const output = await invoke(fakeListChatModel, options, 'test-preamble', 'test-diff');

    expect(output).toBe('First LLM message');
  });
});
