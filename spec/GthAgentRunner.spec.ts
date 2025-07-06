import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { SlothConfig } from '#src/config.js';
import type { StatusUpdateCallback } from '#src/core/GthLangChainAgent.js';
import type { GthAgentInterface } from '#src/core/types.js';
import { RunnableConfig } from '@langchain/core/runnables';

// Mock the GthLangChainAgent - using a simplified approach
const mockAgent = {
  init: vi.fn(),
  setVerbose: vi.fn(),
  invoke: vi.fn(),
  stream: vi.fn(),
  cleanup: vi.fn(),
};

vi.mock('#src/core/GthLangChainAgent.js', () => ({
  GthLangChainAgent: class MockGthLangChainAgent {
    constructor() {
      return mockAgent;
    }
  },
  StatusUpdateCallback: vi.fn(),
}));

describe('GthAgentRunner', () => {
  let GthAgentRunner: typeof import('#src/core/GthAgentRunner.js').GthAgentRunner;
  let statusUpdateCallback: Mock<StatusUpdateCallback>;
  let mockConfig: SlothConfig;

  beforeEach(async () => {
    vi.resetAllMocks();

    // Reset mock implementations
    mockAgent.init.mockClear();
    mockAgent.setVerbose.mockClear();
    mockAgent.invoke.mockClear();
    mockAgent.stream.mockClear();
    mockAgent.cleanup.mockClear();

    statusUpdateCallback = vi.fn();

    mockConfig = {
      projectGuidelines: 'test guidelines',
      llm: {
        _llmType: vi.fn().mockReturnValue('test'),
        verbose: false,
      } as any,
      streamOutput: false,
      contentProvider: 'file',
      requirementsProvider: 'file',
      projectReviewInstructions: '.gsloth.review.md',
      filesystem: 'none',
    };

    ({ GthAgentRunner } = await import('#src/core/GthAgentRunner.js'));
  });

  describe('constructor', () => {
    it('should initialize with status update callback', () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      expect(runner).toBeDefined();
    });

    it('should initialize with custom agent', () => {
      const customAgent: GthAgentInterface = {
        invoke: vi.fn(),
        stream: vi.fn(),
      };
      const runner = new GthAgentRunner(statusUpdateCallback, customAgent);
      expect(runner).toBeDefined();
      expect(runner['agent']).toBe(customAgent);
    });
  });

  describe('setVerbose', () => {
    it('should set verbose mode', () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      runner.setVerbose(true);
      expect(runner['verbose']).toBe(true);
    });

    it('should unset verbose mode', () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      runner.setVerbose(true);
      runner.setVerbose(false);
      expect(runner['verbose']).toBe(false);
    });
  });

  describe('init', () => {
    it('should initialize with basic configuration', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);

      await runner.init(undefined, mockConfig);

      expect(mockAgent.init).toHaveBeenCalledWith(undefined, mockConfig, undefined);
    });

    it('should set verbose on agent when verbose mode is enabled', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      runner.setVerbose(true);

      await runner.init(undefined, mockConfig);

      expect(mockAgent.setVerbose).toHaveBeenCalledWith(true);
    });

    it('should initialize with checkpoint saver', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      const checkpointSaver = new MemorySaver();

      await runner.init(undefined, mockConfig, checkpointSaver);

      expect(mockAgent.init).toHaveBeenCalledWith(undefined, mockConfig, checkpointSaver);
    });

    it('should use custom agent if provided', async () => {
      const customAgent: GthAgentInterface = {
        init: vi.fn(),
        invoke: vi.fn(),
        stream: vi.fn(),
      };
      const runner = new GthAgentRunner(statusUpdateCallback, customAgent);

      await runner.init(undefined, mockConfig);

      // Should not create a new agent since custom one was provided
      expect(mockAgent.init).not.toHaveBeenCalled();
      expect(runner['agent']).toBe(customAgent);
    });

    it('should initialize custom agent with init method', async () => {
      const customAgent: GthAgentInterface & {
        init: (_cmd: any, _config: any, _saver: any) => void;
      } = {
        invoke: vi.fn(),
        stream: vi.fn(),
        init: vi.fn(),
      };
      const runner = new GthAgentRunner(statusUpdateCallback, customAgent);

      await runner.init(undefined, mockConfig);

      expect(customAgent.init).toHaveBeenCalledWith(undefined, mockConfig, undefined);
    });
  });

  describe('processMessages', () => {
    it('should throw error if not initialized', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);

      await expect(runner.processMessages([new HumanMessage('test')])).rejects.toThrow(
        'AgentRunner not initialized. Call init() first.'
      );
    });

    it('should delegate to agent invoke method when streaming is disabled', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      mockAgent.invoke.mockResolvedValue('test response');

      await runner.init(undefined, { ...mockConfig, streamOutput: false });

      const messages = [new HumanMessage('test message')];
      const result = await runner.processMessages(messages);

      expect(mockAgent.invoke).toHaveBeenCalledWith('test message', undefined);
      expect(mockAgent.stream).not.toHaveBeenCalled();
      expect(result).toBe('test response');
    });

    it('should delegate to agent stream method when streaming is enabled', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield 'chunk1';
          yield 'chunk2';
        },
      };
      mockAgent.stream.mockResolvedValue(mockStream);

      await runner.init(undefined, { ...mockConfig, streamOutput: true });

      const messages = [new HumanMessage('test message')];
      const result = await runner.processMessages(messages);

      expect(mockAgent.stream).toHaveBeenCalledWith('test message', undefined);
      expect(mockAgent.invoke).not.toHaveBeenCalled();
      expect(result).toBe('chunk1chunk2');
    });

    it('should handle multiple messages', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      mockAgent.invoke.mockResolvedValue('combined response');

      await runner.init(undefined, { ...mockConfig, streamOutput: false });

      const messages = [new HumanMessage('first message'), new HumanMessage('second message')];
      const result = await runner.processMessages(messages);

      expect(mockAgent.invoke).toHaveBeenCalledWith('first message\nsecond message', undefined);
      expect(result).toBe('combined response');
    });

    it('should pass run config to agent', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);
      mockAgent.invoke.mockResolvedValue('test response');

      await runner.init(undefined, { ...mockConfig, streamOutput: false });

      const messages = [new HumanMessage('test message')];
      const runConfig: RunnableConfig = {
        recursionLimit: 1000,
      };

      const result = await runner.processMessages(messages, runConfig);

      expect(mockAgent.invoke).toHaveBeenCalledWith('test message', runConfig);
      expect(result).toBe('test response');
    });

    it('should work with custom agent', async () => {
      const customAgent: GthAgentInterface = {
        init: vi.fn(),
        invoke: vi.fn().mockResolvedValue('custom response'),
        stream: vi.fn(),
      };
      const runner = new GthAgentRunner(statusUpdateCallback, customAgent);

      await runner.init(undefined, { ...mockConfig, streamOutput: false });

      const messages = [new HumanMessage('test message')];
      const result = await runner.processMessages(messages);

      expect(customAgent.invoke).toHaveBeenCalledWith('test message', undefined);
      expect(result).toBe('custom response');
    });
  });

  describe('cleanup', () => {
    it('should delegate to agent cleanup and reset state', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);

      await runner.init(undefined, mockConfig);
      await runner.cleanup();

      expect(mockAgent.cleanup).toHaveBeenCalled();
      expect(runner['agent']).toBeNull();
      expect(runner['config']).toBeNull();
    });

    it('should handle cleanup when not initialized', async () => {
      const runner = new GthAgentRunner(statusUpdateCallback);

      await expect(runner.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup with custom agent', async () => {
      const customAgent: GthAgentInterface & { cleanup: () => void } = {
        init: vi.fn(),
        invoke: vi.fn(),
        stream: vi.fn(),
        cleanup: vi.fn(),
      };
      const runner = new GthAgentRunner(statusUpdateCallback, customAgent);

      await runner.init(undefined, mockConfig);
      await runner.cleanup();

      expect(customAgent.cleanup).toHaveBeenCalled();
      expect(runner['agent']).toBeNull();
      expect(runner['config']).toBeNull();
    });

    it('should handle cleanup with custom agent without cleanup method', async () => {
      const customAgent: GthAgentInterface = {
        init: vi.fn(),
        invoke: vi.fn(),
        stream: vi.fn(),
      };
      const runner = new GthAgentRunner(statusUpdateCallback, customAgent);

      await runner.init(undefined, mockConfig);

      await expect(runner.cleanup()).resolves.not.toThrow();
      expect(runner['agent']).toBeNull();
      expect(runner['config']).toBeNull();
    });
  });
});
