import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlothConfig } from '#src/config.js';

const invocationMock = {
  setVerbose: vi.fn(),
  init: vi.fn(),
  invoke: vi.fn(),
  cleanup: vi.fn(),
};

const InvocationConstructor = vi.fn();

vi.mock('#src/core/Invocation.js', () => ({
  Invocation: InvocationConstructor,
}));

const consoleUtilsMock = {
  display: vi.fn(),
  displayError: vi.fn(),
  displayInfo: vi.fn(),
  displayWarning: vi.fn(),
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

const systemUtilsMock = {
  stdout: {
    write: vi.fn(),
  },
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

describe('llmUtils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    InvocationConstructor.mockImplementation(() => invocationMock);
  });

  it('should create Invocation and call its methods correctly', async () => {
    invocationMock.invoke.mockResolvedValue('Test response');

    const { invoke } = await import('#src/llmUtils.js');

    const mockConfig: SlothConfig = {
      streamOutput: false,
      llm: {} as any,
      filesystem: 'none',
    } as SlothConfig;
    const messages = [{ role: 'user', content: 'test message' }] as any;

    const result = await invoke('review', messages, mockConfig);

    expect(InvocationConstructor).toHaveBeenCalledWith(expect.any(Function));
    expect(invocationMock.setVerbose).toHaveBeenCalledWith(false);
    expect(invocationMock.init).toHaveBeenCalledWith('review', mockConfig, undefined);
    expect(invocationMock.invoke).toHaveBeenCalledWith(messages, undefined);
    expect(invocationMock.cleanup).toHaveBeenCalled();
    expect(result).toBe('Test response');
  });

  it('should pass runConfig and checkpointSaver when provided', async () => {
    invocationMock.invoke.mockResolvedValue('Another response');

    const { invoke } = await import('#src/llmUtils.js');

    const mockConfig: SlothConfig = {
      streamOutput: true,
      llm: {} as any,
      filesystem: 'all',
    } as SlothConfig;
    const messages = [{ role: 'system', content: 'system message' }] as any;
    const runConfig = { configurable: { thread_id: 'test-thread' } };
    const checkpointSaver = {} as any;

    const result = await invoke('chat', messages, mockConfig, runConfig, checkpointSaver);

    expect(invocationMock.init).toHaveBeenCalledWith('chat', mockConfig, checkpointSaver);
    expect(invocationMock.invoke).toHaveBeenCalledWith(messages, runConfig);
    expect(result).toBe('Another response');
  });

  it('should call cleanup even when invoke throws an error', async () => {
    const error = new Error('Test error');
    invocationMock.invoke.mockRejectedValue(error);

    const { invoke } = await import('#src/llmUtils.js');

    const mockConfig: SlothConfig = {
      streamOutput: false,
      llm: {} as any,
      filesystem: 'none',
    } as SlothConfig;
    const messages = [] as any;

    await expect(invoke('ask', messages, mockConfig)).rejects.toThrow('Test error');
    expect(invocationMock.cleanup).toHaveBeenCalled();
  });

  it('should set verbose mode correctly', async () => {
    invocationMock.invoke.mockResolvedValue('Response');

    const { setVerbose, invoke } = await import('#src/llmUtils.js');

    setVerbose(true);

    const mockConfig: SlothConfig = {
      streamOutput: false,
      llm: {} as any,
      filesystem: 'none',
    } as SlothConfig;
    const messages = [] as any;

    await invoke('code', messages, mockConfig);

    expect(invocationMock.setVerbose).toHaveBeenCalledWith(true);
  });
});
