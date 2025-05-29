import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { SlothContext } from '#src/config.js';
import { SlothConfig } from '#src/config.js';

// Mock fs module
const fsMock = {
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
};
vi.mock('node:fs', () => fsMock);

// Mock path module
const pathMock = {
  resolve: vi.fn(),
  default: {
    resolve: vi.fn(),
  },
};
vi.mock('node:path', () => pathMock);

// Mock systemUtils module
const systemUtilsMock = {
  getCurrentDir: vi.fn(),
  stdout: {
    write: vi.fn(),
  },
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

// Mock consoleUtils module
const consoleUtilsMock = {
  display: vi.fn(),
  displaySuccess: vi.fn(),
  displayError: vi.fn(),
  displayDebug: vi.fn(),
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
  generateStandardFileName: vi.fn(),
};
utilsMock.ProgressIndicator.prototype.stop = vi.fn();
utilsMock.ProgressIndicator.prototype.indicate = vi.fn();

vi.mock('#src/utils.js', () => utilsMock);

// Mock llmUtils module
const llmUtilsMock = {
  invoke: vi.fn(),
};
vi.mock('#src/llmUtils.js', () => llmUtilsMock);

// Create a mock slothContext
const mockSlothContext = {
  config: {
    llm: new FakeListChatModel({
      responses: ['LLM Review Response'],
    }),
  } as Partial<SlothConfig>,
  stdin: '',
} as SlothContext;

// Mock config module
vi.mock('#src/config.js', () => ({
  slothContext: mockSlothContext,
}));

describe('reviewModule', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Setup mock for our new generateStandardFileName function
    utilsMock.generateStandardFileName.mockReturnValue('gth_2025-05-17_21-00-00_REVIEW.md');
    // Setup both the top-level resolve and the default.resolve functions
    const resolveMock = (path: string, name: string) => {
      if (name.includes('gth_')) return 'test-review-file-path.md';
      return '';
    };
    pathMock.resolve.mockImplementation(resolveMock);
    pathMock.default.resolve.mockImplementation(resolveMock);

    // Setup filePathUtils mocks
    filePathUtilsMock.getGslothFilePath.mockReturnValue('test-review-file-path.md');
    filePathUtilsMock.gslothDirExists.mockReturnValue(false);

    llmUtilsMock.invoke.mockResolvedValue('LLM Review Response');
  });

  it('should invoke LLM and write review to file', async () => {
    // Import the module after setting up mocks
    const { review } = await import('#src/modules/reviewModule.js');

    // Call review function
    await review('test-source', 'test-preamble', 'test-diff');

    // Verify that invoke was called with correct parameters
    expect(llmUtilsMock.invoke).toHaveBeenCalledWith(
      mockSlothContext.config.llm,
      'test-preamble',
      'test-diff',
      mockSlothContext.config
    );

    // Verify that writeFileSync was called
    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      'test-review-file-path.md',
      'LLM Review Response'
    );

    // Verify that display was called
    expect(consoleUtilsMock.display).toHaveBeenCalledWith('\nLLM Review Response');

    // Verify that displaySuccess was called
    expect(consoleUtilsMock.displaySuccess).toHaveBeenCalledWith(
      expect.stringContaining('test-review-file-path.md')
    );

    // Verify that ProgressIndicator.stop() was called
    expect(utilsMock.ProgressIndicator.prototype.stop).toHaveBeenCalled();
  });

  it('should handle file write errors', async () => {
    // Mock file write to throw an error
    const error = new Error('File write error');
    fsMock.writeFileSync.mockImplementation(() => {
      throw error;
    });

    // Import the module after setting up mocks
    const { review } = await import('#src/modules/reviewModule.js');

    // Call the function and wait for it to complete
    await review('test-source', 'test-preamble', 'test-diff');

    // Verify error message was displayed
    expect(consoleUtilsMock.displayDebug).toHaveBeenCalled();
    expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write review to file')
    );

    // Verify that ProgressIndicator.stop() was called even with error
    expect(utilsMock.ProgressIndicator.prototype.stop).toHaveBeenCalled();
  });
});
