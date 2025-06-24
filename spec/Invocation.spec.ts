import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { SlothConfig } from '#src/config.js';
import type { StatusUpdateCallback } from '#src/core/Invocation.js';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';

const systemUtilsMock = {
  getCurrentDir: vi.fn(),
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

const progressIndicatorMock = vi.fn().mockImplementation(() => ({
  stop: vi.fn(),
}));
vi.mock('#src/utils.js', () => ({
  ProgressIndicator: progressIndicatorMock,
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

describe('Invocation', () => {
  let Invocation: typeof import('#src/core/Invocation.js').Invocation;
  let statusUpdateCallback: Mock<StatusUpdateCallback>;
  let mockConfig: SlothConfig;
  let mockAgent: any;

  beforeEach(async () => {
    vi.resetAllMocks();

    systemUtilsMock.getCurrentDir.mockReturnValue('/test/dir');
    multiServerMCPClientMock.mockImplementation(() => mcpClientInstanceMock);
    
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

    it('should force streamOutput to false for anthropic LLM', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const anthropicConfig = {
        ...mockConfig,
        streamOutput: true,
        llm: {
          ...mockConfig.llm,
          _llmType: vi.fn().mockReturnValue('anthropic'),
        },
      };
      
      await invocation.init(undefined, anthropicConfig);
      
      expect(statusUpdateCallback).toHaveBeenCalledWith(
        'warning',
        'To avoid known bug with Anthropic forcing streamOutput to false'
      );
      expect(anthropicConfig.streamOutput).toBe(false);
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

    it('should initialize MCP client with filesystem tools', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const configWithFilesystem = {
        ...mockConfig,
        filesystem: 'all',
      };
      
      const mockTools = [
        { name: 'mcp__filesystem__read_file' },
        { name: 'mcp__filesystem__write_file' },
      ];
      mcpClientInstanceMock.getTools.mockResolvedValue(mockTools);
      
      await invocation.init(undefined, configWithFilesystem);
      
      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          filesystem: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/test/dir'],
          },
        },
      });
      expect(statusUpdateCallback).toHaveBeenCalledWith('info', 'Loaded 2 tools.');
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
        messages: [
          new AIMessage('test response'),
        ],
      };
      mockAgent.invoke.mockResolvedValue(mockResponse);
      
      const result = await invocation.invoke(messages);
      
      expect(statusUpdateCallback).toHaveBeenCalledWith('stream', 'Thinking');
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
      
      expect(statusUpdateCallback).toHaveBeenCalledWith('info', '\nUsed tools: read_file, write_file');
    });

    it('should handle errors in non-streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      await invocation.init(undefined, mockConfig);
      
      const messages = [new HumanMessage('test message')];
      const error = new Error('Test error');
      mockAgent.invoke.mockRejectedValue(error);
      
      const result = await invocation.invoke(messages);
      
      expect(statusUpdateCallback).toHaveBeenCalledWith('warning', 'Something went wrong Test error');
      expect(progressIndicatorMock).toHaveBeenCalled();
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
      
      expect(mockAgent.stream).toHaveBeenCalledWith(
        { messages },
        { streamMode: 'messages' }
      );
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
        [new AIMessage({
          content: 'response',
          tool_calls: [{ name: 'read_file', args: {}, id: '1' }],
        }), {}],
      ];
      mockAgent.stream.mockResolvedValue(mockStream);
      
      await invocation.invoke(messages);
      
      expect(statusUpdateCallback).toHaveBeenCalledWith('info', 'Using tool read_file');
    });

    it('should handle multiple tool calls in streaming mode', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const streamConfig = { ...mockConfig, streamOutput: true };
      await invocation.init(undefined, streamConfig);
      
      const messages = [new HumanMessage('test message')];
      const mockStream = [
        [new AIMessage({
          content: 'response',
          tool_calls: [
            { name: 'read_file', args: {}, id: '1' },
            { name: 'write_file', args: {}, id: '2' },
          ],
        }), {}],
      ];
      mockAgent.stream.mockResolvedValue(mockStream);
      
      await invocation.invoke(messages);
      
      expect(statusUpdateCallback).toHaveBeenCalledWith('info', 'Using tools read_file, write_file');
    });

    it('should handle ToolException errors', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      await invocation.init(undefined, mockConfig);
      
      const messages = [new HumanMessage('test message')];
      const error = new Error('Tool failed');
      error.name = 'ToolException';
      mockAgent.invoke.mockRejectedValue(error);
      
      await expect(invocation.invoke(messages)).rejects.toThrow(error);
      expect(statusUpdateCallback).toHaveBeenCalledWith('error', 'Tool execution failed: Tool failed');
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
      const configWithFilesystem = {
        ...mockConfig,
        filesystem: 'all',
      };
      mcpClientInstanceMock.getTools.mockResolvedValue([]);
      
      await invocation.init(undefined, configWithFilesystem);
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

  describe('filterTools', () => {
    it('should return all tools when filesystem is "all"', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const tools: StructuredToolInterface[] = [
        { name: 'mcp__filesystem__read_file' } as any,
        { name: 'mcp__filesystem__write_file' } as any,
        { name: 'mcp__other__tool' } as any,
      ];
      
      const result = invocation['filterTools'](tools, 'all');
      
      expect(result).toEqual(tools);
    });

    it('should return all tools when filesystem is "none"', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const tools: StructuredToolInterface[] = [
        { name: 'mcp__filesystem__read_file' } as any,
        { name: 'mcp__other__tool' } as any,
      ];
      
      const result = invocation['filterTools'](tools, 'none');
      
      expect(result).toEqual(tools);
    });

    it('should filter filesystem tools based on allowed list', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const tools: StructuredToolInterface[] = [
        { name: 'mcp__filesystem__read_file' } as any,
        { name: 'mcp__filesystem__write_file' } as any,
        { name: 'mcp__filesystem__delete_file' } as any,
        { name: 'mcp__other__tool' } as any,
      ];
      
      const result = invocation['filterTools'](tools, ['read_file', 'write_file']);
      
      expect(result).toEqual([
        { name: 'mcp__filesystem__read_file' },
        { name: 'mcp__filesystem__write_file' },
        { name: 'mcp__other__tool' },
      ]);
    });

    it('should include all non-filesystem tools', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const tools: StructuredToolInterface[] = [
        { name: 'mcp__filesystem__read_file' } as any,
        { name: 'mcp__other__tool1' } as any,
        { name: 'mcp__other__tool2' } as any,
      ];
      
      const result = invocation['filterTools'](tools, ['write_file']);
      
      expect(result).toEqual([
        { name: 'mcp__other__tool1' },
        { name: 'mcp__other__tool2' },
      ]);
    });
  });

  describe('getMcpClient', () => {
    it('should return null when no filesystem or MCP servers configured', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'none',
        mcpServers: undefined,
      };
      
      const result = invocation['getMcpClient'](config);
      
      expect(result).toBeNull();
    });

    it('should create MCP client with filesystem server', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'all' as const,
      };
      
      const result = invocation['getMcpClient'](config);
      
      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          filesystem: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/test/dir'],
          },
        },
      });
      expect(result).toBe(mcpClientInstanceMock);
    });

    it('should merge user MCP servers with default filesystem', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const config = {
        ...mockConfig,
        filesystem: 'all' as const,
        mcpServers: {
          custom: {
            transport: 'stdio' as const,
            command: 'custom-server',
            args: [],
          },
        },
      };
      
      const result = invocation['getMcpClient'](config);
      
      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          filesystem: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/test/dir'],
          },
          custom: {
            transport: 'stdio',
            command: 'custom-server',
            args: [],
          },
        },
      });
    });

    it('should override default filesystem config with user config', async () => {
      const invocation = new Invocation(statusUpdateCallback);
      const customFilesystemConfig = {
        transport: 'stdio' as const,
        command: 'custom-fs-server',
        args: ['--custom'],
      };
      const config = {
        ...mockConfig,
        filesystem: 'all' as const,
        mcpServers: {
          filesystem: customFilesystemConfig,
        },
      };
      
      const result = invocation['getMcpClient'](config);
      
      expect(multiServerMCPClientMock).toHaveBeenCalledWith({
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: 'mcp',
        mcpServers: {
          filesystem: customFilesystemConfig,
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
      
      const result = invocation['getMcpClient'](config);
      
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