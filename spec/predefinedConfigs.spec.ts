import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SlothConfig } from "#src/config.js";

// Define mocks at top level
const consoleUtilsMock = {
  display: vi.fn(),
  displayError: vi.fn(),
  displayInfo: vi.fn(),
  displayWarning: vi.fn(),
  displaySuccess: vi.fn(),
  displayDebug: vi.fn(),
};

const fsMock = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
};

// Set up static mocks
vi.mock("node:fs", () => fsMock);
vi.mock("../src/consoleUtils.js", () => consoleUtilsMock);
vi.mock("./consoleUtils.js", () => consoleUtilsMock);

describe("predefined AI provider configurations", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it("Should import predefined Anthropic config correctly", async () => {
    // Mock the Anthropic module and its import
    const mockChat = vi.fn();
    const mockChatInstance = { instance: "anthropic" };
    mockChat.mockReturnValue(mockChatInstance);
    vi.doMock("@langchain/anthropic", () => ({
      ChatAnthropic: mockChat,
    }));

    await testPredefinedAiConfig("anthropic", mockChatInstance);
  });

  it("Should import predefined VertexAI config correctly", async () => {
    // Mock the VertexAI module and its import
    const mockChat = vi.fn();
    const mockChatInstance = { instance: "vertexai" };
    mockChat.mockReturnValue(mockChatInstance);
    vi.doMock("@langchain/google-vertexai", () => ({
      ChatVertexAI: mockChat,
    }));

    await testPredefinedAiConfig("vertexai", mockChatInstance);
  });

  it("Should import predefined Groq config correctly", async () => {
    // Mock the Groq module and its import
    const mockChat = vi.fn();
    const mockChatInstance = { instance: "groq" };
    mockChat.mockReturnValue(mockChatInstance);
    vi.doMock("@langchain/groq", () => ({
      ChatGroq: mockChat,
    }));

    await testPredefinedAiConfig("groq", mockChatInstance);
  });

  async function testPredefinedAiConfig(aiProvider: string, mockInstance: any) {
    const jsonConfig: Partial<SlothConfig> = {
      llm: {
        type: aiProvider,
        model: aiProvider + "model",
        apiKey: "test-api-key",
      },
    };

    fsMock.existsSync.mockImplementation((path: string) => {
      if (path.includes(".gsloth.config.json")) return true;
      return false;
    });

    fsMock.readFileSync.mockImplementation((path: string) => {
      if (path.includes(".gsloth.config.json")) return JSON.stringify(jsonConfig);
      return "";
    });

    const { initConfig, slothContext } = await import("#src/config.js");

    // Call the function
    await initConfig();

    // Verify no warnings or errors were displayed
    expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();

    // Verify the config was set correctly with the mock instance
    expect(slothContext.config.llm).toBe(mockInstance);
  }
});
