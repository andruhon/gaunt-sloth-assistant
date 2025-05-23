import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawSlothConfig } from '#src/config.js';

// Define mocks at top level
const consoleUtilsMock = {
  display: vi.fn(),
  displayError: vi.fn(),
  displayInfo: vi.fn(),
  displayWarning: vi.fn(),
  displaySuccess: vi.fn(),
  displayDebug: vi.fn(),
};
vi.mock('node:fs', () => fsMock);

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
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

const systemUtilsMock = {
  exit: vi.fn(),
  getCurrentDir: vi.fn(),
  getInstallDir: vi.fn(),
  env: {},
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

describe('predefined AI provider configurations', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    systemUtilsMock.getCurrentDir.mockReturnValue('/mock/current/dir');
    systemUtilsMock.getInstallDir.mockReturnValue('/mock/install/dir');
  });

  it('Should import predefined Anthropic config correctly', async () => {
    // Mock the Anthropic module and its import
    const mockChat = vi.fn();
    const mockChatInstance = { instance: 'anthropic' };
    mockChat.mockReturnValue(mockChatInstance);
    vi.doMock('@langchain/anthropic', () => ({
      ChatAnthropic: mockChat,
    }));

    await testPredefinedAiConfig('anthropic', mockChatInstance);
  });

  it('Should import predefined VertexAI config correctly', async () => {
    // Mock the VertexAI module and its import
    const mockChat = vi.fn();
    const mockChatInstance = { instance: 'vertexai' };
    mockChat.mockReturnValue(mockChatInstance);
    vi.doMock('@langchain/google-vertexai', () => ({
      ChatVertexAI: mockChat,
    }));

    await testPredefinedAiConfig('vertexai', mockChatInstance);
  });

  it('Should import predefined Groq config correctly', async () => {
    // Mock the Groq module and its import
    const mockChat = vi.fn();
    const mockChatInstance = { instance: 'groq' };
    mockChat.mockReturnValue(mockChatInstance);
    vi.doMock('@langchain/groq', () => ({
      ChatGroq: mockChat,
    }));

    await testPredefinedAiConfig('groq', mockChatInstance);
  });

  async function testPredefinedAiConfig(aiProvider: string, mockInstance: any) {
    const jsonConfig: Partial<RawSlothConfig> = {
      llm: {
        type: aiProvider,
        model: aiProvider + 'model',
        apiKey: 'test-api-key',
      },
    };

    fsMock.existsSync.mockImplementation((path: string) => {
      if (path.includes('.gsloth.config.json')) return true;
      return false;
    });

    fsMock.readFileSync.mockImplementation((path: string) => {
      if (path.includes('.gsloth.config.json')) return JSON.stringify(jsonConfig);
      return '';
    });

    const { initConfig, slothContext, reset } = await import('#src/config.js');
    reset();

    // Call the function
    await initConfig();

    // Verify no warnings or errors were displayed
    expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();

    // Verify the config was set correctly with the mock instance
    expect(slothContext.config.llm).toBe(mockInstance);
  }
});
