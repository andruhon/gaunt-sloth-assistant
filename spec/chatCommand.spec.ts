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
  readChatPrompt: vi.fn().mockReturnValue('Mock chat prompt'),
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
}));

vi.mock('#src/filePathUtils.js', () => ({
  getGslothFilePath: vi.fn().mockReturnValue('mock/chat/file.txt'),
}));

vi.mock('#src/utils.js', () => ({
  generateStandardFileName: vi.fn().mockReturnValue('mock-chat-file.txt'),
  appendToFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('#src/llmUtils.js', () => ({
  invoke: vi.fn().mockResolvedValue('Mock response'),
}));

vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}));

describe('chatCommand', () => {
  let program: Command;
  let chatCommand: typeof import('#src/commands/chatCommand.js').chatCommand;

  beforeEach(async () => {
    vi.resetModules();
    ({ chatCommand } = await import('#src/commands/chatCommand.js'));
    program = new Command();
    vi.mocked(invoke).mockReset();
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    ({ chatCommand } = await import('#src/commands/chatCommand.js'));
  });

  it('Should display help correctly', () => {
    chatCommand(program);
    expect(program.commands[0].description()).toBe(
      'Start an interactive chat session with Gaunt Sloth'
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

    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat', 'test message']);

    expect(vi.mocked(invoke)).toHaveBeenCalledWith(
      'chat',
      [
        new SystemMessage('Mock backstory\nMock guidelines\nMock chat prompt\nMock system prompt'),
        new HumanMessage('test message'),
      ],
      expect.any(Object),
      expect.any(Object),
      expect.any(MemorySaver)
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

    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat']);

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

    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat']);

    expect(mockReadline.question).toHaveBeenCalledWith('  > ', expect.any(Function));
    expect(vi.mocked(display)).toHaveBeenCalledWith(
      '\nGaunt Sloth is ready to chat. Type your prompt.'
    );
    expect(vi.mocked(display)).toHaveBeenCalledWith(
      chalk.gray("Type 'exit' or hit Ctrl+C to exit chat\n")
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

    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat']); // Start chat session

    await messageHandler('first message');
    await messageHandler('second message');

    expect(vi.mocked(invoke)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(invoke)).toHaveBeenNthCalledWith(
      1,
      'chat',
      [
        new SystemMessage('Mock backstory\nMock guidelines\nMock chat prompt\nMock system prompt'),
        new HumanMessage('first message'),
      ],
      expect.any(Object),
      expect.any(Object),
      expect.any(MemorySaver)
    );
    expect(vi.mocked(invoke)).toHaveBeenNthCalledWith(
      2,
      'chat',
      [new HumanMessage('second message')],
      expect.any(Object),
      expect.any(Object),
      expect.any(MemorySaver)
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
    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat']); // Start chat session
    await messageHandler('first message');
    expect(vi.mocked(appendToFile)).toHaveBeenCalledWith(
      'mock/chat/file.txt',
      '## User\n\nfirst message\n\n## Assistant\n\nMock response\n\n'
    );
  });
});
