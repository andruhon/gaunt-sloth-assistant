import { Command } from 'commander';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { display } from '#src/consoleUtils.js';
import { invoke } from '#src/llmUtils.js';
import type { Interface as ReadlineInterface } from 'node:readline';
import { createInterface } from 'node:readline';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import chalk from 'chalk';
import { appendToFile } from '#src/utils.js';

// Mock modules
vi.mock('#src/prompt.js', () => ({
  readBackstory: vi.fn().mockReturnValue('Mock backstory'),
  readGuidelines: vi.fn().mockReturnValue('Mock guidelines'),
  readSystemPrompt: vi.fn().mockReturnValue('Mock system prompt'),
  readCodePrompt: vi.fn().mockReturnValue('Mock code prompt'),
}));

vi.mock('#src/config.js', () => ({
  initConfig: vi.fn().mockResolvedValue({
    projectGuidelines: 'Mock guidelines',
    llm: 'Mock LLM',
  }),
}));

vi.mock('#src/consoleUtils.js', () => ({
  display: vi.fn(),
  displayError: vi.fn(),
  displaySuccess: vi.fn(),
  displayInfo: vi.fn(),
  displayWarning: vi.fn(),
  displayDebug: vi.fn(),
  defaultStatusCallbacks: vi.fn(),
}));

vi.mock('#src/filePathUtils.js', () => ({
  getGslothFilePath: vi.fn().mockReturnValue('mock/code/file.txt'),
}));

vi.mock('#src/utils.js', () => ({
  generateStandardFileName: vi.fn().mockReturnValue('mock-code-file.txt'),
  appendToFile: vi.fn(),
  ProgressIndicator: vi.fn().mockImplementation(() => ({
    stop: vi.fn(),
  })),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('#src/llmUtils.js', () => ({
  invoke: vi.fn().mockResolvedValue('Mock response'),
}));

vi.mock('#src/core/Invocation.js', () => ({
  Invocation: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue('Mock response'),
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}));

describe('codeCommand', () => {
  let program: Command;
  let codeCommand: typeof import('#src/commands/codeCommand.js').codeCommand;

  beforeEach(async () => {
    vi.resetModules();
    ({ codeCommand } = await import('#src/commands/codeCommand.js'));
    program = new Command();
    vi.mocked(invoke).mockReset();
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    ({ codeCommand } = await import('#src/commands/codeCommand.js'));
  });

  it('Should display help correctly', () => {
    codeCommand(program);
    expect(program.commands[0].description()).toBe(
      'Interactively write code with sloth (has full file system access within your project)'
    );
  });

  it('Should process initial message if provided', async () => {
    const mockReadline = {
      question: vi.fn().mockImplementation((prompt, callback) => {
        callback('exit'); // Simulate exit on next call
      }),
      close: vi.fn(),
      terminal: true,
      line: '',
      cursor: 0,
      getPrompt: vi.fn(),
      setPrompt: vi.fn(),
      prompt: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      write: vi.fn(),
      addListener: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      removeListener: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      eventNames: vi.fn(),
      listenerCount: vi.fn(),
    } as unknown as ReadlineInterface;

    vi.mocked(createInterface).mockReturnValue(mockReadline);

    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code', 'test message']);

    const InvocationMock = vi.mocked(await import('#src/core/Invocation.js')).Invocation;
    const invocationInstance = InvocationMock.mock.results[0].value;

    expect(invocationInstance.init).toHaveBeenCalledWith(
      'code',
      expect.any(Object),
      expect.any(MemorySaver)
    );

    expect(invocationInstance.invoke).toHaveBeenCalledWith(
      [
        new SystemMessage('Mock backstory\nMock guidelines\nMock code prompt\nMock system prompt'),
        new HumanMessage('test message'),
      ],
      expect.any(Object)
    );
  });

  it('Should handle empty message gracefully', async () => {
    let callCount = 0;
    const mockReadline = {
      question: vi.fn().mockImplementation((prompt, callback) => {
        if (callCount === 0) {
          callback(''); // Simulate empty input
        } else {
          callback('exit'); // Simulate exit on next call
        }
        callCount++;
      }),
      close: vi.fn(),
      terminal: true,
      line: '',
      cursor: 0,
      getPrompt: vi.fn(),
      setPrompt: vi.fn(),
      prompt: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      write: vi.fn(),
      addListener: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      removeListener: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      eventNames: vi.fn(),
      listenerCount: vi.fn(),
    } as unknown as ReadlineInterface;

    vi.mocked(createInterface).mockReturnValue(mockReadline);

    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code']);

    expect(mockReadline.question).toHaveBeenCalledWith('  > ', expect.any(Function));
    expect(vi.mocked(invoke)).not.toHaveBeenCalled();
    expect(mockReadline.close).toHaveBeenCalled();
  });

  it('Should greet user on empty first message', async () => {
    let callCount = 0;
    const mockReadline = {
      question: vi.fn().mockImplementation((prompt, callback) => {
        if (callCount === 0) {
          callback(''); // Simulate empty input
        } else {
          callback('exit'); // Simulate exit on next call
        }
        callCount++;
      }),
      close: vi.fn(),
      terminal: true,
      line: '',
      cursor: 0,
      getPrompt: vi.fn(),
      setPrompt: vi.fn(),
      prompt: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      write: vi.fn(),
      addListener: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      removeListener: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      eventNames: vi.fn(),
      listenerCount: vi.fn(),
    } as unknown as ReadlineInterface;

    vi.mocked(createInterface).mockReturnValue(mockReadline);
    vi.mocked(display).mockImplementation(vi.fn());

    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code']);

    expect(mockReadline.question).toHaveBeenCalledWith('  > ', expect.any(Function));
    expect(vi.mocked(display)).toHaveBeenCalledWith(
      '\nGaunt Sloth is ready to code. Type your prompt.'
    );
    expect(vi.mocked(display)).toHaveBeenCalledWith(
      chalk.gray("Type 'exit' or hit Ctrl+C to exit code session\n")
    );
    expect(vi.mocked(invoke)).not.toHaveBeenCalled();
    expect(mockReadline.close).toHaveBeenCalled();
  });

  it('Should maintain conversation context between messages', async () => {
    const mockConfig = {
      projectGuidelines: 'Mock guidelines',
      llm: new FakeStreamingChatModel({}),
      streamOutput: false,
      contentProvider: 'file',
      requirementsProvider: 'file',
      projectReviewInstructions: '.gsloth.review.md',
      filesystem: 'none' as const,
    };
    const { initConfig } = await import('#src/config.js');
    vi.mocked(initConfig).mockResolvedValue(mockConfig);

    let messageHandler: (_message: string) => Promise<void> = async () => {};
    const mockReadline = {
      question: vi.fn().mockImplementation((prompt, callback) => {
        messageHandler = callback;
      }),
      close: vi.fn(),
    };
    vi.mocked(createInterface).mockReturnValue(mockReadline as any);

    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code']); // Start code session

    await messageHandler('first message');
    await messageHandler('second message');

    const InvocationMock = vi.mocked(await import('#src/core/Invocation.js')).Invocation;
    const invocationInstance = InvocationMock.mock.results[0].value;

    expect(invocationInstance.invoke).toHaveBeenCalledTimes(2);
    expect(invocationInstance.invoke).toHaveBeenNthCalledWith(
      1,
      [
        new SystemMessage('Mock backstory\nMock guidelines\nMock code prompt\nMock system prompt'),
        new HumanMessage('first message'),
      ],
      expect.any(Object)
    );
    expect(invocationInstance.invoke).toHaveBeenNthCalledWith(
      2,
      [new HumanMessage('second message')],
      expect.any(Object)
    );
  });

  it('Should save the conversation to a file', async () => {
    const mockConfig = {
      projectGuidelines: 'Mock guidelines',
      llm: new FakeStreamingChatModel({}),
      streamOutput: false,
      contentProvider: 'file',
      requirementsProvider: 'file',
      projectReviewInstructions: '.gsloth.review.md',
      filesystem: 'none' as const,
    };
    const { initConfig } = await import('#src/config.js');
    vi.mocked(initConfig).mockResolvedValue(mockConfig);
    vi.mocked(invoke).mockResolvedValue('Mock response');
    let messageHandler: (_message: string) => Promise<void> = async () => {};
    const mockReadline = {
      question: vi.fn().mockImplementation((prompt, callback) => {
        messageHandler = callback;
      }),
      close: vi.fn(),
    };
    vi.mocked(createInterface).mockReturnValue(mockReadline as any);
    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code']); // Start code session
    await messageHandler('first message');
    expect(vi.mocked(appendToFile)).toHaveBeenCalledWith(
      'mock/code/file.txt',
      '## User\n\nfirst message\n\n## Assistant\n\nMock response\n\n'
    );
  });
});
