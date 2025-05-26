import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';

describe('reviewModule', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it('should invoke LLM (internal)', async () => {
    // Setup mock for slothContext
    let aiMessageChunk = new AIMessageChunk({
      content: 'First LLM message',
      name: 'AIMessageChunk',
    });
    const fakeListChatModel = new FakeStreamingChatModel({
      responses: [aiMessageChunk],
    });

    // Import the module after setting up mocks
    const { invoke } = await import('#src/llmUtils.js');

    // Test the function
    const output = await invoke(fakeListChatModel, 'test-preamble', 'test-diff');

    expect(output).toBe('First LLM message');
  });
});
