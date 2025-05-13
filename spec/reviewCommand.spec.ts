import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SlothContext } from "#src/config.js";

// Define mocks at top level
const review = vi.fn();
const prompt = {
  readInternalPreamble: vi.fn().mockReturnValue("INTERNAL PREAMBLE"),
  readPreamble: vi.fn().mockReturnValue("PROJECT PREAMBLE"),
};

const codeReviewMock = { review };

const utilsMock = {
  readFileFromCurrentDir: vi.fn(),
  readMultipleFilesFromCurrentDir: vi.fn(),
  ProgressIndicator: vi.fn(),
  extractLastMessageContent: vi.fn(),
  toFileSafeString: vi.fn(),
  fileSafeLocalDate: vi.fn(),
};

// Set up static mocks
vi.mock("#src/prompt.js", () => prompt);
vi.mock("#src/modules/reviewModule.js", () => codeReviewMock);
vi.mock("#src/config.js", () => ({
  SLOTH_INTERNAL_PREAMBLE: ".gsloth.preamble.internal.md",
  USER_PROJECT_REVIEW_PREAMBLE: ".gsloth.preamble.review.md",
  slothContext: {
    config: {},
    currentDir: "/mock/current/dir",
    installDir: "/mock/install/dir",
  },
  initConfig: vi.fn(),
}));
vi.mock("#src/utils.js", () => utilsMock);

describe("reviewCommand", () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Setup default mock returns
    utilsMock.readFileFromCurrentDir.mockReturnValue("FILE TO REVIEW");
    utilsMock.readMultipleFilesFromCurrentDir.mockReturnValue(
      "test.file:\n```\nFILE TO REVIEW\n```"
    );
    prompt.readInternalPreamble.mockReturnValue("INTERNAL PREAMBLE");
    prompt.readPreamble.mockReturnValue("PROJECT PREAMBLE");
  });

  it("Should call review with file contents", async () => {
    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    await reviewCommand(program, {} as SlothContext);
    await program.parseAsync(["na", "na", "review", "-f", "test.file"]);

    expect(review).toHaveBeenCalledWith(
      "sloth-DIFF-review",
      "INTERNAL PREAMBLE\nPROJECT PREAMBLE",
      "test.file:\n```\nFILE TO REVIEW\n```"
    );
  });

  it("Should call review with multiple file contents", async () => {
    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    await reviewCommand(program, {} as SlothContext);

    utilsMock.readMultipleFilesFromCurrentDir.mockReturnValue(
      "test.file:\n```\nFILE TO REVIEW\n```\n\ntest2.file:\n```\nFILE2 TO REVIEW\n```"
    );

    await program.parseAsync(["na", "na", "review", "-f", "test.file", "test2.file"]);

    expect(review).toHaveBeenCalledWith(
      "sloth-DIFF-review",
      "INTERNAL PREAMBLE\nPROJECT PREAMBLE",
      "test.file:\n```\nFILE TO REVIEW\n```\n\ntest2.file:\n```\nFILE2 TO REVIEW\n```"
    );
  });

  it("Should display predefined providers in help", async () => {
    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    const testOutput = { text: "" };

    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    await reviewCommand(program, {} as SlothContext);

    const commandUnderTest = program.commands.find((c) => c.name() === "review");
    expect(commandUnderTest).toBeDefined();
    commandUnderTest?.outputHelp();

    // Verify content providers are displayed
    expect(testOutput.text).toContain("--content-provider <contentProvider>");
    expect(testOutput.text).toContain('(choices: "gh", "text", "file")');

    // Verify requirements providers are displayed
    expect(testOutput.text).toContain("--requirements-provider <requirementsProvider>");
    expect(testOutput.text).toContain('(choices: "jira-legacy", "text", "file")');
  });

  it("Should call review with predefined requirements provider", async () => {
    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    const context: SlothContext = {
      config: {
        requirementsProvider: "jira-legacy",
        requirementsProviderConfig: {
          "jira-legacy": {
            username: "test-user",
            token: "test-token",
            baseUrl: "https://test-jira.atlassian.net/rest/api/2/issue/",
          },
        },
        contentProvider: "text",
        commands: {
          pr: {
            contentProvider: "gh",
          },
        },
        pr: {
          requirementsProvider: "jira-legacy",
        },
      },
      installDir: "/mock/install/dir",
      currentDir: "/mock/current/dir",
      stdin: "",
      session: {
        configurable: {
          thread_id: "test-thread",
        },
      },
    };

    // Mock the jira provider
    const jiraProvider = vi.fn().mockResolvedValue("JIRA Requirements");
    vi.doMock("#src/providers/jiraIssueProvider.js", () => ({
      get: jiraProvider,
    }));

    await reviewCommand(program, context);
    await program.parseAsync(["na", "na", "review", "content-id", "-r", "JIRA-123"]);

    expect(review).toHaveBeenCalledWith(
      "sloth-DIFF-review",
      "INTERNAL PREAMBLE\nPROJECT PREAMBLE",
      "JIRA Requirements\ncontent-id"
    );
  });

  it("Should display meaningful error, when JIRA is enabled, but JIRA token is absent", async () => {
    const testOutput = { text: "" };

    // Mock the jira provider to throw an error about missing token
    vi.doMock("#src/providers/jiraIssueProvider.js", () => ({
      get: vi.fn().mockImplementation(() => {
        throw new Error(
          'Missing JIRA Legacy API token. The legacy token can be defined as JIRA_LEGACY_API_TOKEN environment variable or as "token" in config.'
        );
      }),
    }));

    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    const context: SlothContext = {
      config: {
        requirementsProvider: "jira-legacy",
        requirementsProviderConfig: {
          "jira-legacy": {
            username: "test-user",
            baseUrl: "https://test-jira.atlassian.net/rest/api/2/issue/",
          },
        },
        contentProvider: "text",
        commands: {
          pr: {
            contentProvider: "gh",
          },
        },
        pr: {
          requirementsProvider: "jira-legacy",
        },
      },
      installDir: "/mock/install/dir",
      currentDir: "/mock/current/dir",
      stdin: "",
      session: {
        configurable: {
          thread_id: "test-thread",
        },
      },
    };

    await reviewCommand(program, context);

    await expect(program.parseAsync(["na", "na", "pr", "content-id", "JIRA-123"])).rejects.toThrow(
      "Missing JIRA Legacy API token. " +
        "The legacy token can be defined as JIRA_LEGACY_API_TOKEN environment variable " +
        'or as "token" in config.'
    );
  });

  it("Should call review with predefined content provider", async () => {
    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    const context: SlothContext = {
      config: {
        contentProvider: "gh",
        requirementsProvider: "text",
        commands: {
          pr: {
            contentProvider: "gh",
          },
        },
        pr: {
          requirementsProvider: "text",
        },
      },
      installDir: "/mock/install/dir",
      currentDir: "/mock/current/dir",
      stdin: "",
      session: {
        configurable: {
          thread_id: "test-thread",
        },
      },
    };

    // Mock the gh provider
    const ghProvider = vi.fn().mockResolvedValue("PR Diff Content");
    vi.doMock("#src/providers/ghPrDiffProvider.js", () => ({
      get: ghProvider,
    }));

    await reviewCommand(program, context);
    await program.parseAsync(["na", "na", "review", "123"]);

    expect(review).toHaveBeenCalledWith(
      "sloth-DIFF-review",
      "INTERNAL PREAMBLE\nPROJECT PREAMBLE",
      "PR Diff Content"
    );
  });

  it("Should call pr command", async () => {
    const { reviewCommand } = await import("#src/commands/reviewCommand.js");
    const program = new Command();
    const context: SlothContext = {
      config: {
        contentProvider: "text",
        requirementsProvider: "text",
        commands: {
          pr: {
            contentProvider: "gh",
          },
        },
        pr: {
          requirementsProvider: "text",
        },
      },
      installDir: "/mock/install/dir",
      currentDir: "/mock/current/dir",
      stdin: "",
      session: {
        configurable: {
          thread_id: "test-thread",
        },
      },
    };

    // Mock the gh provider
    const ghProvider = vi.fn().mockResolvedValue("PR Diff Content");
    vi.doMock("#src/providers/ghPrDiffProvider.js", () => ({
      get: ghProvider,
    }));

    await reviewCommand(program, context);
    await program.parseAsync(["na", "na", "pr", "123"]);

    expect(review).toHaveBeenCalledWith(
      "sloth-PR-123-review",
      "INTERNAL PREAMBLE\nPROJECT PREAMBLE",
      "PR Diff Content"
    );
  });
});
