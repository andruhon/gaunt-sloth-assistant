import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define mocks at top level
const askQuestion = vi.fn();
const prompt = {
  readBackstory: vi.fn(),
  readGuidelines: vi.fn(),
  readSystemPrompt: vi.fn(),
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

// Mock config to return specific test values
const mockConfig = {
  llm: {
    invoke: vi.fn(),
  },
  projectGuidelines: '.gsloth.guidelines.md',
  projectReviewInstructions: '.gsloth.review.md',
  contentProvider: 'file',
  requirementsProvider: 'file',
  streamOutput: true,
  commands: {
    pr: {
      contentProvider: 'github',
      requirementsProvider: 'github',
    },
    code: {
      filesystem: 'all',
    },
  },
};

// Set up static mocks
vi.mock('#src/prompt.js', () => prompt);
vi.mock('#src/modules/questionAnsweringModule.js', () => questionAnsweringModule);
vi.mock('#src/systemUtils.js', () => ({
  getStringFromStdin: vi.fn().mockReturnValue(''),
}));
const configMock = {
  initConfig: vi.fn(),
  createDefaultConfig: vi.fn(),
};

vi.mock('#src/config.js', () => configMock);
vi.mock('#src/utils.js', () => utilsMock);

describe('codeCommand', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    vi.resetModules();

    // Set up config mock
    configMock.initConfig.mockResolvedValue(mockConfig);
    configMock.createDefaultConfig.mockReturnValue(mockConfig);

    // Mock the util functions
    utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
      if (files.includes('test.file')) {
        return 'test.file:\n```\nFILE CONTENT\n```';
      }
      return '';
    });

    // Mock the prompt functions
    prompt.readBackstory.mockReturnValue('INTERNAL PREAMBLE');
    prompt.readGuidelines.mockReturnValue('PROJECT GUIDELINES');
    prompt.readSystemPrompt.mockReturnValue('');

    const progressIndicator = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    utilsMock.ProgressIndicator.mockImplementation(() => progressIndicator);
  });

  it('Should call askQuestion with message', async () => {
    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code', 'test message']);
    expect(askQuestion).toHaveBeenCalledWith(
      'CODE',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test message',
      mockConfig
    );
  });

  it('Should call askQuestion with message and file content', async () => {
    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code', 'test message', '-f', 'test.file']);
    expect(askQuestion).toHaveBeenCalledWith(
      'CODE',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test.file:\n```\nFILE CONTENT\n```\ntest message',
      mockConfig
    );
  });

  it('Should call askQuestion with message and multiple file contents', async () => {
    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);
    utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
      if (files.includes('test.file') && files.includes('test2.file')) {
        return 'test.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```';
      }
      return '';
    });
    await program.parseAsync(['na', 'na', 'code', 'test message', '-f', 'test.file', 'test2.file']);
    expect(askQuestion).toHaveBeenCalledWith(
      'CODE',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```\ntest message',
      mockConfig
    );
  });

  it('Should display help correctly', async () => {
    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);
    expect(program.commands[0].name()).toEqual('code');
    expect(program.commands[0].description()).toEqual(
      'Ask Sloth to write some code (has full file system access within your project)'
    );
  });

  it('Should call askQuestion with file content only (no message)', async () => {
    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code', '-f', 'test.file']);
    expect(askQuestion).toHaveBeenCalledWith(
      'CODE',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'test.file:\n```\nFILE CONTENT\n```',
      mockConfig
    );
  });

  it('Should call askQuestion with stdin content only (no message)', async () => {
    const { getStringFromStdin } = await import('#src/systemUtils.js');
    vi.mocked(getStringFromStdin).mockReturnValue('STDIN CONTENT');

    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);
    await program.parseAsync(['na', 'na', 'code']);
    expect(askQuestion).toHaveBeenCalledWith(
      'CODE',
      'INTERNAL PREAMBLE\nPROJECT GUIDELINES',
      'STDIN CONTENT',
      mockConfig
    );
  });

  it('Should throw error when no input source is provided', async () => {
    const { getStringFromStdin } = await import('#src/systemUtils.js');
    vi.mocked(getStringFromStdin).mockReturnValue('');

    const { codeCommand } = await import('#src/commands/codeCommand.js');
    const program = new Command();
    codeCommand(program);

    await expect(program.parseAsync(['na', 'na', 'code'])).rejects.toThrow(
      'At least one of the following is required: file, stdin, or message'
    );
  });
});
