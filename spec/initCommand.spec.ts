import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Define mock at top level
const createProjectConfig = vi.fn();

// Mock the config module
vi.mock("#src/config.js", () => ({
  createProjectConfig,
  availableDefaultConfigs: ["vertexai", "anthropic", "groq"],
  SLOTH_INTERNAL_PREAMBLE: ".gsloth.preamble.internal.md",
  USER_PROJECT_REVIEW_PREAMBLE: ".gsloth.preamble.review.md",
  slothContext: {
    installDir: "/mock/install/dir",
    currentDir: "/mock/current/dir",
    config: {},
    session: {
      configurable: {
        thread_id: "test-thread",
      },
    },
  },
}));

describe("initCommand", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it("Should call createProjectConfig with the provided config type", async () => {
    const { initCommand } = await import("../src/commands/initCommand.js");
    const program = new Command();
    await initCommand(program);
    await program.parseAsync(["na", "na", "init", "vertexai"]);
    expect(createProjectConfig).toHaveBeenCalledWith("vertexai");
  });

  it("Should display available config types in help", async () => {
    const { initCommand } = await import("../src/commands/initCommand.js");
    const program = new Command();
    const testOutput = { text: "" };

    program.configureOutput({
      writeOut: (str: string) => (testOutput.text += str),
      writeErr: (str: string) => (testOutput.text += str),
    });

    await initCommand(program);

    const commandUnderTest = program.commands.find((c) => c.name() === "init");
    expect(commandUnderTest).toBeDefined();
    commandUnderTest?.outputHelp();

    // Verify available config types are displayed
    expect(testOutput.text).toContain("<type>");
    expect(testOutput.text).toContain('(choices: "vertexai", "anthropic", "groq")');
  });
});
