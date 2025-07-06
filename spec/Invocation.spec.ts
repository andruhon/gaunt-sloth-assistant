import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { SlothConfig } from '#src/config.js';
import type { StatusUpdateCallback } from '#src/core/GthReactAgent.js';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { GthAgentInterface } from '#src/core/types.js';

// Mock the GthReactAgent - using a simplified approach
const mockAgent = {
  init: vi.fn(),
  setVerbose: vi.fn(),
  invoke: vi.fn(),
  cleanup: vi.fn(),
};

vi.mock('#src/core/GthReactAgent.js', () => ({
  GthReactAgent: class MockGthReactAgent {
    constructor() {
      return mockAgent;
    }
  },
  StatusUpdateCallback: vi.fn(),
}));

describe('Invocation', () => {
  let Invocation: typeof import('#src/core/Invocation.js').Invocation;
  let statusUpdateCallback: Mock<StatusUpdateCallback>;
  let mockConfig: SlothConfig;

  beforeEach(async () => {
    vi.resetAllMocks();

    // Reset mock implementations
    mockAgent.init.mockClear();
    mockAgent.setVerbose.mockClear();
    mockAgent.invoke.mockClear();
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

    ({ Invocation } = await import('#src/core/Invocation.js'));
  });

  describe('constructor', () => {
    it('should initialize with status update callback', () => {
      const invocation = new Invocation(statusUpdateCallback);
      expect(invocation).toBeDefined();
    });

    it('should initialize with custom agent', () => {
      const customAgent: GthAgentInterface = {
        invoke: vi.fn(),
        stream: vi.fn(),
      };
      const invocation = new Invocation(statusUpdateCallback, customAgent);
      expect(invocation).toBeDefined();
      expect(invocation['agent']).toBe(customAgent);
    });
  });

  describe('setVerbose', () => {
    it('should set verbose mode', () => {
      const invocation = new Invocation(statusUpdateCallback);
      invocation.setVerbose(true);
      expect(invocation['verbose']).toBe(true);
    });

    it('should unset verbose mode', () => {
      const invocation = new Invocation(statusUpdateCallback);
      invocation.setVerbose(true);
      invocation.setVerbose(false);
      expect(invocation['verbose']).toBe(false);
    });
  });

  describe('init', () => {
    it('should initialize with basic configuration', async () => {
      const invocation = new Invocation(statusUpdateCallback);

      await invocation.init(undefined, mockConfig);

      expect(mockAgent.init).toHaveBeenCalledWith(undefined, mockConfig, undefined);
    });

    it('should set verbose on agent when verbose mode is enabled', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      invocation.setVerbose(true);

      await invocation.init(undefined, mockConfig);

      expect(mockAgent.setVerbose).toHaveBeenCalledWith(true);
    });

    it('should initialize with checkpoint saver', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const checkpointSaver = new MemorySaver();

      await invocation.init(undefined, mockConfig, checkpointSaver);

      expect(mockAgent.init).toHaveBeenCalledWith(undefined, mockConfig, checkpointSaver);
    });

    it('should use custom agent if provided', async () => {
      const customAgent: GthAgentInterface = {
        invoke: vi.fn(),
        stream: vi.fn(),
      };
      const invocation = new Invocation(statusUpdateCallback, customAgent);

      await invocation.init(undefined, mockConfig);

      // Should not create a new agent since custom one was provided
      expect(mockAgent.init).not.toHaveBeenCalled();
      expect(invocation['agent']).toBe(customAgent);
    });

    it('should initialize custom agent with init method', async () => {
      const customAgent: GthAgentInterface & {
        init: (_cmd: any, _config: any, _saver: any) => void;
      } = {
        invoke: vi.fn(),
        stream: vi.fn(),
        init: vi.fn(),
      };
      const invocation = new Invocation(statusUpdateCallback, customAgent);

      await invocation.init(undefined, mockConfig);

      expect(customAgent.init).toHaveBeenCalledWith(undefined, mockConfig, undefined);
    });
  });

  describe('invoke', () => {
    it('should throw error if not initialized', async () => {
      const invocation = new Invocation(statusUpdateCallback);

      await expect(invocation.invoke([new HumanMessage('test')])).rejects.toThrow(
        'Invocation not initialized. Call init() first.'
      );
    });

    it('should delegate to agent invoke method', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      mockAgent.invoke.mockResolvedValue('test response');

      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const result = await invocation.invoke(messages);

      expect(mockAgent.invoke).toHaveBeenCalledWith('test message', { runnableConfig: undefined });
      expect(result).toBe('test response');
    });

    it('should handle multiple messages', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      mockAgent.invoke.mockResolvedValue('combined response');

      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('first message'), new HumanMessage('second message')];
      const result = await invocation.invoke(messages);

      expect(mockAgent.invoke).toHaveBeenCalledWith('first message\nsecond message', {
        runnableConfig: undefined,
      });
      expect(result).toBe('combined response');
    });

    it('should pass run config to agent', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      mockAgent.invoke.mockResolvedValue('test response');

      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const runConfig: RunnableConfig = { configurable: { thread_id: 'test' } };

      const result = await invocation.invoke(messages, runConfig);

      expect(mockAgent.invoke).toHaveBeenCalledWith('test message', { runnableConfig: runConfig });
      expect(result).toBe('test response');
    });

    it('should work with custom agent', async () => {
      const customAgent: GthAgentInterface = {
        invoke: vi.fn().mockResolvedValue('custom response'),
        stream: vi.fn(),
      };
      const invocation = new Invocation(statusUpdateCallback, customAgent);

      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const result = await invocation.invoke(messages);

      expect(customAgent.invoke).toHaveBeenCalledWith('test message', {
        runnableConfig: undefined,
      });
      expect(result).toBe('custom response');
    });
  });

  describe('cleanup', () => {
    it('should delegate to agent cleanup and reset state', async () => {
      const invocation = new Invocation(statusUpdateCallback);

      await invocation.init(undefined, mockConfig);
      await invocation.cleanup();

      expect(mockAgent.cleanup).toHaveBeenCalled();
      expect(invocation['agent']).toBeNull();
      expect(invocation['config']).toBeNull();
    });

    it('should handle cleanup when not initialized', async () => {
      const invocation = new Invocation(statusUpdateCallback);

      await expect(invocation.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup with custom agent', async () => {
      const customAgent: GthAgentInterface & { cleanup: () => void } = {
        invoke: vi.fn(),
        stream: vi.fn(),
        cleanup: vi.fn(),
      };
      const invocation = new Invocation(statusUpdateCallback, customAgent);

      await invocation.init(undefined, mockConfig);
      await invocation.cleanup();

      expect(customAgent.cleanup).toHaveBeenCalled();
      expect(invocation['agent']).toBeNull();
      expect(invocation['config']).toBeNull();
    });

    it('should handle cleanup with custom agent without cleanup method', async () => {
      const customAgent: GthAgentInterface = {
        invoke: vi.fn(),
        stream: vi.fn(),
      };
      const invocation = new Invocation(statusUpdateCallback, customAgent);

      await invocation.init(undefined, mockConfig);

      await expect(invocation.cleanup()).resolves.not.toThrow();
      expect(invocation['agent']).toBeNull();
      expect(invocation['config']).toBeNull();
    });
  });
});
