import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { AIMessageChunk } from '@langchain/core/messages';
import type { SlothConfig } from '#src/config.js';

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

    // Create a mock config
    const mockConfig = {
      streamOutput: false,
    } as SlothConfig;

    // Test the function
    const output = await invoke(fakeListChatModel, 'test-preamble', 'test-diff', mockConfig);

    expect(output).toBe('First LLM message');
  });
});
