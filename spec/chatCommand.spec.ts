import { Command } from 'commander';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { display } from '#src/consoleUtils.js';
import { invoke } from '#src/llmUtils.js';
import type { Interface as ReadlineInterface } from 'node:readline';
import { createInterface } from 'node:readline';

// Mock modules
vi.mock('#src/prompt.js', () => ({
  readBackstory: vi.fn().mockReturnValue('Mock backstory'),
  readGuidelines: vi.fn().mockReturnValue('Mock guidelines'),
  readSystemPrompt: vi.fn().mockReturnValue('Mock system prompt'),
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
}));

vi.mock('node:fs', () => ({
  appendFileSync: vi.fn(),
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
      expect.any(String),
      expect.any(String),
      expect.stringContaining('test message'),
      expect.any(Object),
      'chat'
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

    expect(mockReadline.question).toHaveBeenCalledWith('> ', expect.any(Function));
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
    vi.mocked(display).mockImplementation(console.log);

    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat']);

    expect(mockReadline.question).toHaveBeenCalledWith('> ', expect.any(Function));
    expect(vi.mocked(display)).toHaveBeenCalledWith(
      "Hello! I'm Gaunt Sloth, your AI assistant. How can I help you today?"
    );
    expect(vi.mocked(invoke)).not.toHaveBeenCalled();
    expect(mockReadline.close).toHaveBeenCalled();
  });

  it('Should maintain conversation context between messages', async () => {
    chatCommand(program);
    await program.parseAsync(['na', 'na', 'chat', 'first message']);
    await program.parseAsync(['na', 'na', 'chat', 'second message']);

    expect(vi.mocked(invoke)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(invoke)).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.any(String),
      expect.stringContaining('first message'),
      expect.any(Object),
      'chat'
    );
  });
});
