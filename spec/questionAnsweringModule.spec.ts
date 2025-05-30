import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import type { SlothConfig } from '#src/config.js';

// Mock fs module
const fsMock = {
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
};
vi.mock('node:fs', () => fsMock);

// Mock path module
const pathMock = {
  resolve: vi.fn(),
};
vi.mock('node:path', () => pathMock);

// Mock systemUtils module
const systemUtilsMock = {
  getCurrentDir: vi.fn(),
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

// Mock consoleUtils module
const consoleUtilsMock = {
  display: vi.fn(),
  displaySuccess: vi.fn(),
  displayError: vi.fn(),
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

// Mock filePathUtils module
const filePathUtilsMock = {
  getGslothFilePath: vi.fn(),
  gslothDirExists: vi.fn(),
};
vi.mock('#src/filePathUtils.js', () => filePathUtilsMock);

// Mock utils module
const utilsMock = {
  ProgressIndicator: vi.fn(),
  toFileSafeString: vi.fn(),
  fileSafeLocalDate: vi.fn(),
  createSystemMessage: vi.fn(),
  createHumanMessage: vi.fn(),
  generateStandardFileName: vi.fn(),
};
utilsMock.ProgressIndicator.prototype.stop = vi.fn();
utilsMock.ProgressIndicator.prototype.indicate = vi.fn();

vi.mock('#src/utils.js', () => utilsMock);

// Create a complete mock config for prop drilling
const mockConfig = {
  llm: new FakeStreamingChatModel({
    responses: ['LLM Response'],
  }),
  contentProvider: 'file',
  requirementsProvider: 'file',
  projectGuidelines: '.gsloth.guidelines.md',
  projectReviewInstructions: '.gsloth.review.md',
  streamOutput: false,
  commands: {
    pr: {
      contentProvider: 'github',
      requirementsProvider: 'github',
    },
  },
} as SlothConfig;

// Mock config module
vi.mock('#src/config.js', () => ({
  SlothConfig: {},
  slothContext: {
    config: mockConfig,
  },
}));

// Mock llmUtils module
const llmUtilsMock = {
  invoke: vi.fn().mockResolvedValue('LLM Response'),
};
vi.mock('#src/llmUtils.js', () => llmUtilsMock);

describe('questionAnsweringModule', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Setup mock for our new generateStandardFileName function
    utilsMock.generateStandardFileName.mockReturnValue('gth_2025-05-17_21-00-00_ASK.md');
    pathMock.resolve.mockImplementation((path: string, name: string) => {
      if (name && name.includes('gth_')) return 'test-file-path.md';
      return '';
    });

    // Setup filePathUtils mocks
    filePathUtilsMock.getGslothFilePath.mockReturnValue('test-file-path.md');
    filePathUtilsMock.gslothDirExists.mockReturnValue(false);
  });

  it('should invoke LLM with prop drilling', async () => {
    // Reset the mock LLM for this test
    const testConfig = { ...mockConfig };
    testConfig.llm = new FakeStreamingChatModel({
      responses: ['LLM Response'],
    });
    // @ts-expect-error - bindTools is not in the type definition but is used in the implementation
    testConfig.llm.bindTools = vi.fn();

    // Import the module after setting up mocks
    const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');

    // Call askQuestion with config (prop drilling)
    await askQuestion('test-source', 'test-preamble', 'test-content', testConfig);

    // Verify that invoke was called with correct parameters
    expect(llmUtilsMock.invoke).toHaveBeenCalledWith(
      testConfig.llm,
      'test-preamble',
      'test-content',
      testConfig
    );

    // Verify that writeFileSync was called
    expect(fsMock.writeFileSync).toHaveBeenCalled();

    // Verify that display was called
    expect(consoleUtilsMock.display).toHaveBeenCalled();

    // Verify that displaySuccess was called
    expect(consoleUtilsMock.displaySuccess).toHaveBeenCalled();

    // Verify that ProgressIndicator.stop() was called
    expect(utilsMock.ProgressIndicator.prototype.stop).toHaveBeenCalled();
  });

  it('Should handle file write errors with prop drilling', async () => {
    const testConfig = { ...mockConfig };
    testConfig.llm = new FakeStreamingChatModel({
      responses: ['LLM Response'],
    });

    // Mock file write to throw an error
    const error = new Error('File write error');
    fsMock.writeFileSync.mockImplementation(() => {
      throw error;
    });

    // Import the module after setting up mocks
    const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');

    // Call the function with config (prop drilling) and wait for it to complete
    await askQuestion('gth-ASK', 'Test Preamble', 'Test Content', testConfig);

    // Verify error message was displayed
    expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
      expect.stringContaining('test-file-path.md')
    );
    expect(consoleUtilsMock.displayError).toHaveBeenCalledWith('File write error');

    // Verify that ProgressIndicator.stop() was called even with error
    expect(utilsMock.ProgressIndicator.prototype.stop).toHaveBeenCalled();
  });

  // Specific test to verify that prop drilling works with different config objects
  it('should work with different config objects via prop drilling', async () => {
    // Create a different config object to prove prop drilling works
    const differentConfig = {
      ...mockConfig,
      streamOutput: true, // Different from default mockConfig
      llm: new FakeStreamingChatModel({
        responses: ['Different LLM Response'],
      }),
    } as SlothConfig;

    // Set a different response for this specific test
    llmUtilsMock.invoke.mockResolvedValue('Different LLM Response');

    // Import the module after setting up mocks
    const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');

    // Call askQuestion with the different config to prove prop drilling works
    await askQuestion('test-source', 'test-preamble', 'test-content', differentConfig);

    // Verify the different config was used
    expect(llmUtilsMock.invoke).toHaveBeenCalledWith(
      differentConfig.llm,
      'test-preamble',
      'test-content',
      differentConfig
    );

    // Verify the output matches what we expect
    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      'test-file-path.md',
      'Different LLM Response'
    );

    // Since streamOutput is true, display should not be called
    expect(consoleUtilsMock.display).not.toHaveBeenCalled();
  });
});
