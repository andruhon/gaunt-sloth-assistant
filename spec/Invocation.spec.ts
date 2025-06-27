import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { SlothConfig } from '#src/config.js';
import type { StatusUpdateCallback } from '#src/core/Invocation.js';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

const systemUtilsMock = {
  getCurrentDir: vi.fn(),
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

const configMock = {
  getDefaultTools: vi.fn(),
};
vi.mock('#src/config.js', async () => {
  const actual = await vi.importActual('#src/config.js');
  return {
    ...actual,
    getDefaultTools: configMock.getDefaultTools,
  };
});

const progressIndicatorInstanceMock = {
  stop: vi.fn(),
};
const progressIndicatorMock = vi.fn().mockImplementation(() => progressIndicatorInstanceMock);
vi.mock('#src/utils.js', () => ({
  ProgressIndicator: progressIndicatorMock,
  formatToolCalls: vi.fn((toolCalls) => toolCalls.map((tc: any) => `${tc.name}()`).join(', ')),
}));

const createReactAgentMock = vi.fn();
vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: createReactAgentMock,
}));

const multiServerMCPClientMock = vi.fn();
const mcpClientInstanceMock = {
  getTools: vi.fn(),
  close: vi.fn(),
};
vi.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: multiServerMCPClientMock,
}));

const gthFileSystemToolkitMock = {
  getTools: vi.fn(() => []),
};
const GthFileSystemToolkitConstructorMock = vi.fn();
GthFileSystemToolkitConstructorMock.mockImplementation(() => {
  const instance = Object.create({});
  instance.getTools = gthFileSystemToolkitMock.getTools;
  return instance;
});
vi.mock('#src/tools/GthFileSystemToolkit.js', () => ({
  default: GthFileSystemToolkitConstructorMock,
}));

describe('Invocation', () => {
  let Invocation: typeof import('#src/core/Invocation.js').Invocation;
  let statusUpdateCallback: Mock<StatusUpdateCallback>;
  let mockConfig: SlothConfig;
  let mockAgent: any;

  beforeEach(async () => {
    vi.resetAllMocks();

    systemUtilsMock.getCurrentDir.mockReturnValue('/test/dir');
    multiServerMCPClientMock.mockImplementation(() => mcpClientInstanceMock);
    progressIndicatorMock.mockImplementation(() => progressIndicatorInstanceMock);
    gthFileSystemToolkitMock.getTools.mockReturnValue([]);

    // Setup config mocks
    configMock.getDefaultTools.mockReturnValue([]);

    mockAgent = {
      invoke: vi.fn(),
      stream: vi.fn(),
    };
    createReactAgentMock.mockReturnValue(mockAgent);

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
      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, mockConfig);

      expect(createReactAgentMock).toHaveBeenCalledWith({
        llm: mockConfig.llm,
        tools: [],
        checkpointSaver: undefined,
      });
    });

    it('should set verbose on LLM when verbose mode is enabled', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      invocation.setVerbose(true);
      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, mockConfig);

      expect(mockConfig.llm.verbose).toBe(true);
    });

    it('should use command-specific filesystem config', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const configWithCommands = {
        ...mockConfig,
        commands: {
          code: {
            filesystem: ['read_file', 'write_file'],
          },
        },
      };

      await invocation.init('code', configWithCommands);

      expect(invocation['config']?.filesystem).toEqual(['read_file', 'write_file']);
    });

    it('should display loaded tools as comma-separated list', async () => {
      // Create a simple config with custom tools to test the message format
      const invocation = new Invocation(statusUpdateCallback);
      const mockTools = [
        { name: 'custom_tool_1', invoke: vi.fn(), description: 'Test tool 1' },
        { name: 'custom_tool_2', invoke: vi.fn(), description: 'Test tool 2' },
        { name: 'custom_tool_3', invoke: vi.fn(), description: 'Test tool 3' },
      ] as Partial<StructuredToolInterface>[];

      const configWithTools = {
        ...mockConfig,
        tools: mockTools,
        filesystem: 'none', // Disable filesystem tools to simplify test
      } as SlothConfig;

      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, configWithTools);

      // Should display comma-separated list of tool names
      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'info',
        'Loaded tools: custom_tool_1, custom_tool_2, custom_tool_3'
      );
    });

    it('should initialize with checkpoint saver', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const checkpointSaver = new MemorySaver();
      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, mockConfig, checkpointSaver);

      expect(createReactAgentMock).toHaveBeenCalledWith({
        llm: mockConfig.llm,
        tools: [],
        checkpointSaver,
      });
    });

    it('should flatten toolkits into individual tools', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const mockToolkit = {
        getTools: () => [
          { name: 'custom_tool_1' } as StructuredToolInterface,
          { name: 'custom_tool_2' } as StructuredToolInterface,
        ],
      };
      const mockTool = { name: 'status_update' } as StructuredToolInterface;

      const configWithTools = {
        ...mockConfig,
        tools: [mockToolkit, mockTool],
      } as SlothConfig;

      // Reset default toolkit mock to return empty for this test since filesystem is 'none'
      gthFileSystemToolkitMock.getTools.mockReturnValue([]);
      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, configWithTools);

      // Since filesystem is 'none', only non-filesystem tools should remain
      expect(createReactAgentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: mockConfig.llm,
          tools: expect.arrayContaining([
            expect.objectContaining({ name: 'custom_tool_1' }),
            expect.objectContaining({ name: 'custom_tool_2' }),
            expect.objectContaining({ name: 'status_update' }),
          ]),
          checkpointSaver: undefined,
        })
      );
    });

    it('should combine toolkit tools with MCP tools', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const mockToolkit = {
        getTools: () => [{ name: 'custom_tool' } as StructuredToolInterface],
      };

      const configWithTools = {
        ...mockConfig,
        tools: [mockToolkit],
      } as SlothConfig;

      // Reset default toolkit mock to return empty for this test since filesystem is 'none'
      gthFileSystemToolkitMock.getTools.mockReturnValue([]);
      const mcpTools = [{ name: 'mcp__filesystem__list_directory' } as StructuredToolInterface];
      mcpClientInstanceMock.getTools.mockResolvedValue(mcpTools);

      await invocation.init(undefined, configWithTools);

      // Since filesystem is 'none', MCP filesystem tools should be filtered out
      expect(createReactAgentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: mockConfig.llm,
          tools: expect.arrayContaining([expect.objectContaining({ name: 'custom_tool' })]),
          checkpointSaver: undefined,
        })
      );
    });
  });

  describe('invoke', () => {
    it('should throw error if not initialized', async () => {
      const invocation = new Invocation(statusUpdateCallback);

      await expect(invocation.invoke([new HumanMessage('test')])).rejects.toThrow(
        'Invocation not initialized. Call init() first.'
      );
    });

    it('should invoke agent in non-streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const mockResponse = {
        messages: [new AIMessage('test response')],
      };
      mockAgent.invoke.mockResolvedValue(mockResponse);

      const result = await invocation.invoke(messages);

      expect(mockAgent.invoke).toHaveBeenCalledWith({ messages }, undefined);
      expect(statusUpdateCallback).toHaveBeenCalledWith('display', 'test response');
      expect(result).toBe('test response');
    });

    it('should display tool usage in non-streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const mockResponse = {
        messages: [
          new AIMessage({
            content: 'test response',
            tool_calls: [
              { name: 'read_file', args: {}, id: '1' },
              { name: 'write_file', args: {}, id: '2' },
            ],
          }),
        ],
      };
      mockAgent.invoke.mockResolvedValue(mockResponse);

      await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'info',
        '\nUsed tools: read_file(), write_file()'
      );
    });

    it('should handle errors in non-streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const error = new Error('Test error');
      mockAgent.invoke.mockRejectedValue(error);

      const result = await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'warning',
        'Something went wrong Test error'
      );
      expect(progressIndicatorMock).toHaveBeenCalled();
      expect(progressIndicatorInstanceMock.stop).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should invoke agent in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const streamConfig = { ...mockConfig, streamOutput: true };
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];
      const mockStream = [
        [new AIMessage({ content: 'chunk1' }), {}],
        [new AIMessage({ content: 'chunk2' }), {}],
      ];
      mockAgent.stream.mockResolvedValue(mockStream);

      const result = await invocation.invoke(messages);

      expect(mockAgent.stream).toHaveBeenCalledWith({ messages }, { streamMode: 'messages' });
      expect(statusUpdateCallback).toHaveBeenCalledWith('stream', 'chunk1');
      expect(statusUpdateCallback).toHaveBeenCalledWith('stream', 'chunk2');
      expect(result).toBe('chunk1chunk2');
    });

    it('should display tool usage in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const streamConfig = { ...mockConfig, streamOutput: true };
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];
      const mockStream = [
        [
          new AIMessage({
            content: 'response',
            tool_calls: [{ name: 'read_file', args: {}, id: '1' }],
          }),
          {},
        ],
      ];
      mockAgent.stream.mockResolvedValue(mockStream);

      await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith('info', 'Used tools: read_file()');
    });

    it('should handle multiple tool calls in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const streamConfig = { ...mockConfig, streamOutput: true };
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];
      const mockStream = [
        [
          new AIMessage({
            content: 'response',
            tool_calls: [
              { name: 'read_file', args: {}, id: '1' },
              { name: 'write_file', args: {}, id: '2' },
            ],
          }),
          {},
        ],
      ];
      mockAgent.stream.mockResolvedValue(mockStream);

      await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'info',
        'Used tools: read_file(), write_file()'
      );
    });

    it('should handle ToolException errors in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const streamConfig = { ...mockConfig, streamOutput: true };
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];
      const error = new Error('Tool failed');
      error.name = 'ToolException';

      // Create a mock async generator that throws the error
      const mockStream = (async function* () {
        throw error;
      })();

      mockAgent.stream.mockResolvedValue(mockStream);

      await expect(invocation.invoke(messages)).rejects.toThrow(error);
      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'error',
        'Tool execution failed: Tool failed'
      );
    });

    it('should pass run config to agent', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      await invocation.init(undefined, mockConfig);

      const messages = [new HumanMessage('test message')];
      const runConfig: RunnableConfig = { configurable: { thread_id: 'test' } };
      const mockResponse = {
        messages: [new AIMessage('test response')],
      };
      mockAgent.invoke.mockResolvedValue(mockResponse);

      await invocation.invoke(messages, runConfig);

      expect(mockAgent.invoke).toHaveBeenCalledWith({ messages }, runConfig);
    });
  });

  describe('cleanup', () => {
    it('should cleanup MCP client and reset state', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const configWithMcp = {
        ...mockConfig,
        mcpServers: {
          custom: {
            transport: 'stdio' as const,
            command: 'custom-server',
            args: [],
          },
        },
      } as SlothConfig;
      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, configWithMcp);
      await invocation.cleanup();

      expect(mcpClientInstanceMock.close).toHaveBeenCalled();
      expect(invocation['mcpClient']).toBeNull();
      expect(invocation['agent']).toBeNull();
      expect(invocation['config']).toBeNull();
    });

    it('should handle cleanup when not initialized', async () => {
      const invocation = new Invocation(statusUpdateCallback);

      await expect(invocation.cleanup()).resolves.not.toThrow();
    });
  });

  describe('getMcpClient', () => {
    it('should return null when no filesystem or MCP servers configured', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'none',
        mcpServers: undefined,
      } as SlothConfig;

      const _result = invocation['getMcpClient'](config);

      expect(_result).toBeNull();
    });

    it('should create MCP client with custom server', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'all' as const,
        mcpServers: {
          custom: {
            transport: 'stdio' as const,
            command: 'custom-server',
            args: ['--arg'],
          },
        },
      };

      const result = invocation['getMcpClient'](config);

      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          custom: {
            transport: 'stdio',
            command: 'custom-server',
            args: ['--arg'],
          },
        },
      });
      expect(result).toBe(mcpClientInstanceMock);
    });

    it('should combine default servers with user config', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'all' as const,
        mcpServers: {
          custom: {
            transport: 'stdio' as const,
            command: 'custom-server',
            args: ['--custom'],
          },
        },
      };

      invocation['getMcpClient'](config);

      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          custom: {
            transport: 'stdio',
            command: 'custom-server',
            args: ['--custom'],
          },
        },
      });
    });

    it('should create MCP client with only user servers when no filesystem', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'none' as const,
        mcpServers: {
          custom: {
            transport: 'stdio' as const,
            command: 'custom-server',
            args: [],
          },
        },
      };

      invocation['getMcpClient'](config);

      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          custom: {
            transport: 'stdio',
            command: 'custom-server',
            args: [],
          },
        },
      });
    });
  });
});
