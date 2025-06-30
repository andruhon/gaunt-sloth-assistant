import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { AIMessage, AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { SlothConfig } from '#src/config.js';
import type { StatusUpdateCallback } from '#src/core/Invocation.js';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  FakeChatInput,
  FakeListChatModel,
  FakeStreamingChatModel,
} from '@langchain/core/utils/testing';

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

  beforeEach(async () => {
    vi.resetAllMocks();

    systemUtilsMock.getCurrentDir.mockReturnValue('/test/dir');
    multiServerMCPClientMock.mockImplementation(() => mcpClientInstanceMock);
    progressIndicatorMock.mockImplementation(() => progressIndicatorInstanceMock);
    gthFileSystemToolkitMock.getTools.mockReturnValue([]);

    // Setup config mocks
    configMock.getDefaultTools.mockResolvedValue([]);

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
    });

    it('should flatten toolkits into individual tools', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const mockToolkit = {
        getTools: () => [
          { name: 'custom_tool_1' } as StructuredToolInterface,
          { name: 'custom_tool_2' } as StructuredToolInterface,
        ],
      };
      const mockTool = { name: 'gth_status_update' } as StructuredToolInterface;

      const configWithTools = {
        ...mockConfig,
        tools: [mockToolkit, mockTool],
      } as SlothConfig;

      // Reset default toolkit mock to return empty for this test since filesystem is 'none'
      gthFileSystemToolkitMock.getTools.mockReturnValue([]);
      mcpClientInstanceMock.getTools.mockResolvedValue([]);

      await invocation.init(undefined, configWithTools);
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
      const fakeListChatModel = new FakeListChatModel({
        responses: ['test response'],
      });
      fakeListChatModel.bindTools = vi.fn().mockReturnValue(fakeListChatModel);

      const config = {
        ...mockConfig,
        llm: fakeListChatModel,
      };
      await invocation.init(undefined, config);

      const messages = [new HumanMessage('test message')];

      const result = await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith('display', 'test response');
      expect(result).toBe('test response');
    });

    it('should display tool usage in non-streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const fakeListChatModel = new FakeListChatModel({
        responses: [
          new AIMessage({
            content: 'test response',
            tool_calls: [
              { name: 'read_file', args: {}, id: '1' },
              { name: 'write_file', args: {}, id: '2' },
            ],
          }) as any as string,
        ],
      });
      fakeListChatModel.bindTools = vi.fn().mockReturnValue(fakeListChatModel);

      const config = {
        ...mockConfig,
        llm: fakeListChatModel,
      };
      await invocation.init(undefined, config);

      const messages = [new HumanMessage('test message')];

      await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'info',
        '\nUsed tools: read_file(), write_file()'
      );
    });

    it('should handle errors in non-streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const fakeListChatModel = new FakeListChatModel({
        responses: [],
        simulateError: true,
      } as FakeChatInput);
      fakeListChatModel.bindTools = vi.fn().mockReturnValue(fakeListChatModel);

      const config = {
        ...mockConfig,
        llm: fakeListChatModel,
      };
      await invocation.init(undefined, config);

      const messages = [new HumanMessage('test message')];

      const result = await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'warning',
        expect.stringContaining('Something went wrong')
      );
      expect(progressIndicatorMock).toHaveBeenCalled();
      expect(progressIndicatorInstanceMock.stop).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should invoke agent in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const fakeStreamingChatModel = new FakeStreamingChatModel({
        chunks: [
          new AIMessageChunk({ content: 'chunk1' }),
          new AIMessageChunk({ content: 'chunk2' }),
        ],
      });
      fakeStreamingChatModel.bindTools = vi.fn().mockReturnValue(fakeStreamingChatModel);

      const streamConfig = {
        ...mockConfig,
        llm: fakeStreamingChatModel,
        streamOutput: true,
      };
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];

      const result = await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith('stream', 'chunk1');
      expect(statusUpdateCallback).toHaveBeenCalledWith('stream', 'chunk2');
      expect(result).toBe('chunk1chunk2');
    });

    it('should display tool usage in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const fakeStreamingChatModel = new FakeStreamingChatModel({
        chunks: [
          new AIMessageChunk({
            content: 'response',
            tool_calls: [{ name: 'read_file', args: {}, id: '1' }],
          }),
          new AIMessageChunk({
            content: ' done', // Add a final chunk without tool calls to end the agent loop
          }),
        ],
      });
      fakeStreamingChatModel.bindTools = vi.fn().mockReturnValue(fakeStreamingChatModel);

      const streamConfig = {
        ...mockConfig,
        llm: fakeStreamingChatModel,
        streamOutput: true,
      };
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];

      await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith('info', '\nUsed tools: read_file()');
    });

    it('should handle multiple tool calls in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const fakeStreamingChatModel = new FakeStreamingChatModel({
        chunks: [
          new AIMessageChunk({
            content: 'chunk content',
            tool_calls: [
              { name: 'read_file', args: {}, id: '1' },
              { name: 'write_file', args: {}, id: '2' },
            ],
          }),
          new AIMessageChunk({
            content: 'bye', // If the tool calls is the last one, the reactor will continue
          }),
        ],
      });
      fakeStreamingChatModel.bindTools = vi.fn().mockReturnValue(fakeStreamingChatModel);

      // Create mock tools to prevent recursion
      const mockTools = [
        {
          name: 'read_file',
          description: 'Mock read file tool',
          invoke: vi.fn().mockResolvedValue('file content'),
        } as Partial<StructuredToolInterface>,
        {
          name: 'write_file',
          description: 'Mock write file tool',
          invoke: vi.fn().mockResolvedValue('write success'),
        } as Partial<StructuredToolInterface>,
      ];

      const streamConfig = {
        ...mockConfig,
        llm: fakeStreamingChatModel,
        streamOutput: true,
        tools: mockTools,
      } as SlothConfig;
      await invocation.init(undefined, streamConfig);

      const messages = [new HumanMessage('test message')];

      await invocation.invoke(messages);

      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'info',
        '\nUsed tools: read_file(), write_file()'
      );
    });

    it('should handle ToolException errors in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const error = new Error('Tool failed');
      error.name = 'ToolException';

      // Create a simple streaming model that will throw when streamed
      const fakeStreamingChatModel = new FakeStreamingChatModel({
        chunks: [new AIMessageChunk({ content: 'test' })],
      });
      fakeStreamingChatModel.bindTools = vi.fn().mockReturnValue(fakeStreamingChatModel);

      const streamConfig = {
        ...mockConfig,
        llm: fakeStreamingChatModel,
        streamOutput: true,
      };
      await invocation.init(undefined, streamConfig);

      // Mock the agent's stream method to throw the ToolException
      const agent = invocation['agent'];
      if (agent) {
        agent.stream = vi.fn().mockImplementation(async function* () {
          throw error;
        });
      }

      const messages = [new HumanMessage('test message')];

      await expect(invocation.invoke(messages)).rejects.toThrow(error);
      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'error',
        'Tool execution failed: Tool failed'
      );
    });

    it('should pass run config to agent', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const fakeListChatModel = new FakeListChatModel({
        responses: ['test response'],
      });
      fakeListChatModel.bindTools = vi.fn().mockReturnValue(fakeListChatModel);

      const config = {
        ...mockConfig,
        llm: fakeListChatModel,
      };
      await invocation.init(undefined, config);

      const messages = [new HumanMessage('test message')];
      const runConfig: RunnableConfig = { configurable: { thread_id: 'test' } };

      const result = await invocation.invoke(messages, runConfig);

      expect(result).toBe('test response');
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
