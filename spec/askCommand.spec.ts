import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() to ensure ctx is available during mock setup
const ctx = vi.hoisted(() => ({
  prompt: {
    readInternalPreamble: vi.fn(),
  },
  utilsMock: {
    readFileFromCurrentDir: vi.fn(),
    readMultipleFilesFromCurrentDir: vi.fn(),
    ProgressIndicator: vi.fn(),
    extractLastMessageContent: vi.fn(),
    toFileSafeString: vi.fn(),
    fileSafeLocalDate: vi.fn(),
  },
  questionAnsweringModule: {
    askQuestion: vi.fn(),
  },
  config: {
    SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
    USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
    slothContext: {
      config: {
        llm: {
          invoke: vi.fn(),
        },
      },
      currentDir: '/mock/current/dir',
      installDir: '/mock/install/dir',
      session: { configurable: { thread_id: 'test-thread-id' } },
    },
    initConfig: vi.fn(),
  },
}));

// Mock modules before any tests
vi.doMock('#src/prompt.js', () => ctx.prompt);

vi.doMock('#src/config.js', () => ctx.config);

vi.doMock('#src/utils.js', () => ctx.utilsMock);

vi.doMock('#src/modules/questionAnsweringModule.js', () => ctx.questionAnsweringModule);

describe('askCommand', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Set up mocks
    ctx.utilsMock.readFileFromCurrentDir.mockImplementation((path: string) => {
      if (path === 'test.file') return 'FILE CONTENT';
      return '';
    });
    ctx.utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
      if (files.includes('test.file')) return 'test.file:\n```\nFILE CONTENT\n```';
      return '';
    });
    ctx.prompt.readInternalPreamble.mockReturnValue('INTERNAL PREAMBLE');

    // Set up ProgressIndicator mock
    const progressIndicator = {
      indicate: vi.fn(),
    };
    ctx.utilsMock.ProgressIndicator.mockImplementation(() => progressIndicator);
  });

  it('Should call askQuestion with message', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    await program.parseAsync(['na', 'na', 'ask', 'test message']);
    expect(ctx.questionAnsweringModule.askQuestion).toHaveBeenCalledWith(
      'sloth-ASK',
      'INTERNAL PREAMBLE',
      'test message'
    );
  });

  it('Should call askQuestion with message and file content', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file']);
    expect(ctx.questionAnsweringModule.askQuestion).toHaveBeenCalledWith(
      'sloth-ASK',
      'INTERNAL PREAMBLE',
      'test message\ntest.file:\n```\nFILE CONTENT\n```'
    );
  });

  it('Should call askQuestion with message and multiple file contents', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    ctx.utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
      if (files.includes('test.file') && files.includes('test2.file')) {
        return 'test.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```';
      }
      return '';
    });
    await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file', 'test2.file']);
    expect(ctx.questionAnsweringModule.askQuestion).toHaveBeenCalledWith(
      'sloth-ASK',
      'INTERNAL PREAMBLE',
      'test message\ntest.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```'
    );
  });

  it('Should display help correctly', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    const testOutput = { text: '' };

    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    await askCommand(program);

    const commandUnderTest = program.commands.find((c) => c.name() === 'ask');
    expect(commandUnderTest).toBeDefined();
    commandUnderTest?.outputHelp();

    // Verify help content
    expect(testOutput.text).toContain('Ask a question');
    expect(testOutput.text).toContain('<message>');
    expect(testOutput.text).toContain('-f, --file');
  });
});
