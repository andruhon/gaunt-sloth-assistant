import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define mocks at top level
const askQuestion = vi.fn();
const prompt = {
  readBackstory: vi.fn(),
  readGuidelines: vi.fn(),
};

const questionAnsweringModule = { askQuestion };

const utilsMock = {
  readFileFromCurrentDir: vi.fn(),
  readMultipleFilesFromCurrentDir: vi.fn(),
  ProgressIndicator: vi.fn(),
  extractLastMessageContent: vi.fn(),
  toFileSafeString: vi.fn(),
  fileSafeLocalDate: vi.fn(),
  generateStandardFileName: vi.fn(),
};

// Set up static mocks
vi.mock('#src/prompt.js', () => prompt);
vi.mock('#src/modules/questionAnsweringModule.js', () => questionAnsweringModule);
vi.mock('#src/systemUtils.js', () => ({
  getStringFromStdin: vi.fn().mockReturnValue(''),
}));
vi.mock('#src/config.js', () => ({
  GSLOTH_BACKSTORY: '.gsloth.backstory.md',
  USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.guidelines.md',
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
}));
vi.mock('#src/utils.js', () => utilsMock);

describe('askCommand', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Setup default mock returns
    utilsMock.readFileFromCurrentDir.mockImplementation((path: string) => {
      if (path === 'test.file') return 'FILE CONTENT';
      return '';
    });
    utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
      if (files.includes('test.file')) return 'test.file:\n```\nFILE CONTENT\n```';
      return '';
    });
    prompt.readBackstory.mockReturnValue('INTERNAL PREAMBLE');
    prompt.readGuidelines.mockReturnValue('PROJECT GUIDELINES');

    // Set up ProgressIndicator mock
    const progressIndicator = {
      indicate: vi.fn(),
    };
    utilsMock.ProgressIndicator.mockImplementation(() => progressIndicator);
  });

  it('Should call askQuestion with message', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    await program.parseAsync(['na', 'na', 'ask', 'test message']);
    expect(askQuestion).toHaveBeenCalledWith(
      'ASK',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test message'
    );
  });

  it('Should call askQuestion with message and file content', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file']);
    expect(askQuestion).toHaveBeenCalledWith(
      'ASK',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test.file:\n```\nFILE CONTENT\n```\ntest message'
    );
  });

  it('Should call askQuestion with message and multiple file contents', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
      if (files.includes('test.file') && files.includes('test2.file')) {
        return 'test.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```';
      }
      return '';
    });
    await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file', 'test2.file']);
    expect(askQuestion).toHaveBeenCalledWith(
      'ASK',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```\ntest message'
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
    expect(testOutput.text).toContain('[message]');
    expect(testOutput.text).toContain('-f, --file');
  });

  it('Should call askQuestion with file content only (no message)', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    await askCommand(program);
    await program.parseAsync(['na', 'na', 'ask', '-f', 'test.file']);
    expect(askQuestion).toHaveBeenCalledWith(
      'ASK',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test.file:\n```\nFILE CONTENT\n```'
    );
  });

  it('Should call askQuestion with stdin content only (no message)', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    vi.mocked(await import('#src/systemUtils.js')).getStringFromStdin.mockReturnValue(
      'STDIN CONTENT'
    );
    await askCommand(program);
    await program.parseAsync(['na', 'na', 'ask']);
    expect(askQuestion).toHaveBeenCalledWith(
      'ASK',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'STDIN CONTENT'
    );
  });

  it('Should throw error when no input source is provided', async () => {
    const { askCommand } = await import('#src/commands/askCommand.js');
    const program = new Command();
    vi.mocked(await import('#src/systemUtils.js')).getStringFromStdin.mockReturnValue('');
    await askCommand(program);

    await expect(program.parseAsync(['na', 'na', 'ask'])).rejects.toThrow(
      'At least one of the following is required: file, stdin, or message'
    );
  });
});
