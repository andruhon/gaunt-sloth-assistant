import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlothConfig } from '#src/config.js';
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
  ProgressIndicator: vi.fn(),
  extractLastMessageContent: vi.fn(),
  toFileSafeString: vi.fn(),
  fileSafeLocalDate: vi.fn(),
  generateStandardFileName: vi.fn(),
};

// Set up static mocks
vi.mock('#src/prompt.js', () => prompt);
vi.mock('#src/config.js', () => ({
  initConfig: vi.fn().mockResolvedValue({
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
  }),
}));
vi.mock('#src/utils.js', () => utilsMock);

describe('reviewCommand', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Setup default mock returns
    utilsMock.readFileFromCurrentDir.mockReturnValue('FILE TO REVIEW');
    utilsMock.readMultipleFilesFromCurrentDir.mockReturnValue(
      'test.file:\n```\nFILE TO REVIEW\n```'
    );
    prompt.readBackstory.mockReturnValue('INTERNAL BACKSTORY');
    prompt.readGuidelines.mockReturnValue('PROJECT GUIDELINES');
    prompt.readReviewInstructions.mockReturnValue('REVIEW INSTRUCTIONS');
  });

  it('Should call review with file contents', async () => {
    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();

    // Create a proper mock context with a valid config for the test
    const mockConfig = {
      contentProvider: 'file',
      requirementsProvider: 'file',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'file',
        },
        review: {
          requirementsProvider: 'file',
          contentProvider: 'file',
        },
      },
      projectGuidelines: '.gsloth.guidelines.md',
      projectReviewInstructions: '.gsloth.review.md',
      streamOutput: false,
      llm: {} as BaseChatModel,
    } as SlothConfig;

    await reviewCommand(program, mockConfig);
    await program.parseAsync(['na', 'na', 'review', '-f', 'test.file']);

    expect(review).toHaveBeenCalledWith(
      'REVIEW',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'test.file:\n```\nFILE TO REVIEW\n```',
      mockConfig
    );
  });

  it('Should call review with multiple file contents', async () => {
    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();

    // Create a proper mock context with a valid config for the test
    const mockConfig = {
      contentProvider: 'file',
      requirementsProvider: 'file',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'file',
        },
        review: {
          requirementsProvider: 'file',
          contentProvider: 'file',
        },
      },
      projectGuidelines: '.gsloth.guidelines.md',
      projectReviewInstructions: '.gsloth.review.md',
      streamOutput: false,
      llm: {} as BaseChatModel,
    } as SlothConfig;

    await reviewCommand(program, mockConfig);

    utilsMock.readMultipleFilesFromCurrentDir.mockReturnValue(
      'test.file:\n```\nFILE TO REVIEW\n```\n\ntest2.file:\n```\nFILE2 TO REVIEW\n```'
    );

    await program.parseAsync(['na', 'na', 'review', '-f', 'test.file', 'test2.file']);

    expect(review).toHaveBeenCalledWith(
      'REVIEW',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'test.file:\n```\nFILE TO REVIEW\n```\n\ntest2.file:\n```\nFILE2 TO REVIEW\n```',
      mockConfig
    );
  });

  it('Should display predefined providers in help', async () => {
    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();
    const testOutput = { text: '' };

    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    await reviewCommand(program, {} as SlothConfig);

    const commandUnderTest = program.commands.find((c) => c.name() === 'review');
    expect(commandUnderTest).toBeDefined();
    commandUnderTest?.outputHelp();

    // Verify content providers are displayed
    expect(testOutput.text).toContain('--content-provider <contentProvider>');
    expect(testOutput.text).toContain('(choices: "github", "text", "file")');

    // Verify requirements providers are displayed
    expect(testOutput.text).toContain('--requirements-provider <requirementsProvider>');
    expect(testOutput.text).toContain('(choices: "jira-legacy", "jira", "github", "text", "file")');
  });

  it('Should call review with predefined requirements provider', async () => {
    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();
    const config: SlothConfig = {
      requirementsProvider: 'jira-legacy',
      requirementsProviderConfig: {
        'jira-legacy': {
          username: 'test-user',
          token: 'test-token',
          baseUrl: 'https://test-jira.atlassian.net/rest/api/2/issue/',
        },
      },
      contentProvider: 'text',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'jira-legacy',
        },
        review: {
          requirementsProvider: 'jira-legacy',
          contentProvider: 'text',
        },
      },
      projectGuidelines: '.gsloth.guidelines.md',
      projectReviewInstructions: '.gsloth.review.md',
      streamOutput: false,
      llm: {} as BaseChatModel,
    } as SlothConfig;

    // Mock the jira provider
    const jiraProvider = vi.fn().mockResolvedValue('JIRA Requirements');
    vi.doMock('#src/providers/jiraIssueLegacyProvider.js', () => ({
      get: jiraProvider,
    }));

    await reviewCommand(program, config);
    await program.parseAsync(['na', 'na', 'review', 'content-id', '-r', 'JIRA-123']);

    expect(review).toHaveBeenCalledWith(
      'REVIEW',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'JIRA Requirements\ncontent-id',
      config
    );
  });

  it('Should display meaningful error, when JIRA is enabled, but JIRA token is absent', async () => {
    const testOutput = { text: '' };

    // Mock the jira provider to throw an error about missing token
    vi.doMock('#src/providers/jiraIssueLegacyProvider.js', () => ({
      get: vi.fn().mockImplementation(() => {
        throw new Error(
          'Missing JIRA Legacy API token. The legacy token can be defined as JIRA_LEGACY_API_TOKEN environment variable or as "token" in config.'
        );
      }),
    }));

    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();
    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    const config = {
      llm: { invoke: vi.fn() } as unknown as BaseChatModel,
      requirementsProvider: 'jira-legacy',
      requirementsProviderConfig: {
        'jira-legacy': {
          username: 'test-user',
          baseUrl: 'https://test-jira.atlassian.net/rest/api/2/issue/',
        },
      },
      contentProvider: 'text',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'jira-legacy',
        },
      },
      projectGuidelines: '.gsloth.guidelines.md',
      projectReviewInstructions: '.gsloth.review.md',
      streamOutput: true,
    } as SlothConfig;

    await reviewCommand(program, config);

    await expect(program.parseAsync(['na', 'na', 'pr', 'content-id', 'JIRA-123'])).rejects.toThrow(
      'Missing JIRA Legacy API token. ' +
        'The legacy token can be defined as JIRA_LEGACY_API_TOKEN environment variable ' +
        'or as "token" in config.'
    );
  });

  it('Should call review with predefined content provider', async () => {
    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();
    const config: SlothConfig = {
      contentProvider: 'github',
      requirementsProvider: 'text',
      commands: {
        pr: {
          contentProvider: 'github',
          requirementsProvider: 'text',
        },
        review: {
          requirementsProvider: 'text',
          contentProvider: 'github',
        },
      },
      projectGuidelines: '.gsloth.guidelines.md',
      projectReviewInstructions: '.gsloth.review.md',
      streamOutput: false,
      llm: {} as BaseChatModel,
    } as SlothConfig;

    // Mock the gh provider
    const ghProvider = vi.fn().mockResolvedValue('PR Diff Content');
    vi.doMock('#src/providers/ghPrDiffProvider.js', () => ({
      get: ghProvider,
    }));

    await reviewCommand(program, config);
    await program.parseAsync(['na', 'na', 'review', '123']);

    expect(review).toHaveBeenCalledWith(
      'REVIEW',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'PR Diff Content',
      config
    );
  });

  it('Should call pr command', async () => {
    const { reviewCommand } = await import('#src/commands/reviewCommand.js');
    const program = new Command();
    const config: SlothConfig = {
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
      projectGuidelines: '.gsloth.guidelines.md',
      projectReviewInstructions: '.gsloth.review.md',
      streamOutput: false,
      llm: {} as BaseChatModel,
    } as SlothConfig;

    // Mock the gh provider
    const ghProvider = vi.fn().mockResolvedValue('PR Diff Content');
    vi.doMock('#src/providers/ghPrDiffProvider.js', () => ({
      get: ghProvider,
    }));

    await reviewCommand(program, config);
    await program.parseAsync(['na', 'na', 'pr', '123']);

    expect(review).toHaveBeenCalledWith(
      'PR-123',
      'INTERNAL BACKSTORY\nPROJECT GUIDELINES\nREVIEW INSTRUCTIONS',
      'PR Diff Content',
      config
    );
  });
});
