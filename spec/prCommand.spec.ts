import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

// Define mocks at the top level
const review = vi.fn();
const prompt = {
  readBackstory: vi.fn(),
  readGuidelines: vi.fn(),
  readReviewInstructions: vi.fn(),
};

// Use a direct mock for the review function instead of a nested implementation
vi.mock('#src/modules/reviewModule.js', () => ({
  review: review,
}));

const utilsMock = {
  readFileFromCurrentDir: vi.fn(),
  readMultipleFilesFromCurrentDir: vi.fn(),
  readFileSyncWithMessages: vi.fn(),
  execAsync: vi.fn(),
  ProgressIndicator: vi.fn(),
  extractLastMessageContent: vi.fn(),
  toFileSafeString: vi.fn(),
  fileSafeLocalDate: vi.fn(),
  generateStandardFileName: vi.fn(),
};

// Set up static mocks
const mockConfig = {
  llm: { invoke: vi.fn() } as unknown as BaseChatModel,
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
    review: {},
  },
};

const configMock = {
  initConfig: vi.fn(),
};

vi.mock('#src/prompt.js', () => prompt);
vi.mock('#src/config.js', () => configMock);
vi.mock('#src/utils.js', () => utilsMock);

describe('prCommand', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Setup default mock returns
    configMock.initConfig.mockResolvedValue(mockConfig);
    utilsMock.readFileFromCurrentDir.mockReturnValue('FILE TO REVIEW');
    utilsMock.readMultipleFilesFromCurrentDir.mockReturnValue(
      'test.file:\n```\nFILE TO REVIEW\n```'
    );
    utilsMock.readFileSyncWithMessages.mockReturnValue('content-id');
    utilsMock.execAsync.mockResolvedValue('');
    prompt.readBackstory.mockReturnValue('INTERNAL BACKSTORY');
    prompt.readGuidelines.mockReturnValue('PROJECT GUIDELINES');
    prompt.readReviewInstructions.mockReturnValue('REVIEW INSTRUCTIONS');
  });

  it('Should call pr command', async () => {
    // Setup specific config for this test
    const testConfig = {
      ...mockConfig,
      contentProvider: 'text',
      requirementsProvider: 'text',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'text',
        },
        review: {
          requirementsProvider: 'text',
          contentProvider: 'text',
        },
      },
      streamOutput: false,
    };
    configMock.initConfig.mockResolvedValue(testConfig);

    const { prCommand } = await import('#src/commands/prCommand.js');
    const program = new Command();

    // Mock the gh provider
    const ghProvider = vi.fn().mockResolvedValue('PR Diff Content');
    vi.doMock('#src/providers/ghPrDiffProvider.js', () => ({
      get: ghProvider,
    }));

    prCommand(program);
    await program.parseAsync(['na', 'na', 'pr', '123']);

    expect(review).toHaveBeenCalledWith(
      'PR-123',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'PR Diff Content',
      expect.objectContaining({
        contentProvider: 'text',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
      })
    );
  });

  it('Should call pr command with requirements', async () => {
    // Setup specific config for this test
    const testConfig = {
      ...mockConfig,
      requirementsProvider: 'text',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'text',
        },
        review: {},
      },
      streamOutput: false,
    };
    configMock.initConfig.mockResolvedValue(testConfig);

    const { prCommand } = await import('#src/commands/prCommand.js');
    const program = new Command();

    // Mock the gh provider
    const ghProvider = vi.fn().mockResolvedValue('PR Diff Content');
    vi.doMock('#src/providers/ghPrDiffProvider.js', () => ({
      get: ghProvider,
    }));

    // Mock the text provider for requirements
    const textProvider = vi.fn().mockResolvedValue('Requirements content');
    vi.doMock('#src/providers/text.js', () => ({
      get: textProvider,
    }));

    prCommand(program);
    await program.parseAsync(['na', 'na', 'pr', '123', 'req-456']);

    expect(review).toHaveBeenCalledWith(
      'PR-123',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'Requirements content\nPR Diff Content',
      expect.objectContaining({
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
      })
    );
  });

  it('Should display meaningful error, when JIRA is enabled, but JIRA token is absent', async () => {
    // Setup config that will trigger JIRA error (missing token)
    const errorConfig = {
      ...mockConfig,
      requirementsProvider: 'jira-legacy',
      requirementsProviderConfig: {
        'jira-legacy': {
          username: 'test-user',
          baseUrl: 'https://test-jira.atlassian.net/rest/api/2/issue/',
          // Note: no token provided
        },
      },
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'jira-legacy',
        },
        review: {},
      },
    };
    configMock.initConfig.mockResolvedValue(errorConfig);

    const testOutput = { text: '' };

    const { prCommand } = await import('#src/commands/prCommand.js');
    const program = new Command();
    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    prCommand(program);

    await expect(program.parseAsync(['na', 'na', 'pr', 'content-id', 'JIRA-123'])).rejects.toThrow(
      'Missing JIRA Legacy API token. ' +
        'The legacy token can be defined as JIRA_LEGACY_API_TOKEN environment variable ' +
        'or as "token" in config.'
    );
  });

  it('Should display predefined providers in help', async () => {
    const { prCommand } = await import('#src/commands/prCommand.js');
    const program = new Command();
    const testOutput = { text: '' };

    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    prCommand(program);

    const commandUnderTest = program.commands.find((c) => c.name() === 'pr');
    expect(commandUnderTest).toBeDefined();
    commandUnderTest?.outputHelp();

    // Verify requirements providers are displayed
    expect(testOutput.text).toContain('--requirements-provider <requirementsProvider>');
    expect(testOutput.text).toContain('(choices: "jira-legacy", "jira", "github", "text", "file")');
  });
});
