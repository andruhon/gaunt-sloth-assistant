import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { AIMessageChunk, SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { SlothConfig } from '#src/config.js';

describe('reviewModule', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it('should invoke LLM (internal)', async () => {
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
    const mockConfig: SlothConfig = {
      streamOutput: false,
      llm: fakeListChatModel,
      filesystem: 'none',
      contentProvider: 'test',
      requirementsProvider: 'test',
      projectGuidelines: 'test',
      projectReviewInstructions: 'test',
    };
    const messages = [new SystemMessage('test-preamble'), new HumanMessage('test-diff')];

    // Test the function
    const output = await invoke('review', messages, mockConfig);

    expect(output).toBe('First LLM message');
  });
});
