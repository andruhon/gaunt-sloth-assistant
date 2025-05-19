import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { SlothContext } from '#src/config.js';
import { SlothConfig } from '#src/config.js';

// Mocks defined outside of beforeEach
const langchainToolsFsMock = {
  name: vi.fn(),
  description: vi.fn(),
};
vi.mock('langchain/tools/fs', () => langchainToolsFsMock);

const langchainStoresFileNode = {
  NodeFileStore: vi.fn(),
};
vi.mock('langchain/stores/file/node', () => langchainStoresFileNode);

const fsMock = {
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
};
vi.mock('node:fs', () => fsMock);

const systemUtilsMock = {
  getCurrentDir: vi.fn(),
  stdout: {
    write: vi.fn(),
  },
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

const consoleUtilsMock = {
  display: vi.fn(),
  displaySuccess: vi.fn(),
  displayError: vi.fn(),
  displayDebug: vi.fn(),
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

const filePathUtilsMock = {
  getGslothFilePath: vi.fn(),
};
vi.mock('#src/filePathUtils.js', () => filePathUtilsMock);

const utilsMock = {
  ProgressIndicator: vi.fn(),
  generateStandardFileName: vi.fn(),
};
utilsMock.ProgressIndicator.prototype.stop = vi.fn();
vi.mock('#src/utils.js', () => utilsMock);

const llmUtilsMock = {
  invoke: vi.fn(),
};
vi.mock('#src/llmUtils.js', () => llmUtilsMock);

// Mock slothContext
const mockLlm = new FakeListChatModel({
  responses: ['LLM Review Response'],
});
mockLlm.bindTools = vi.fn();

const mockSlothContext = {
  config: {
    llm: mockLlm,
  } as Partial<SlothConfig>,
  session: {},
} as SlothContext;

vi.mock('#src/config.js', () => ({
  slothContext: mockSlothContext,
}));

describe('reviewModule with file access tool', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Set up mocks for common behavior
    systemUtilsMock.getCurrentDir.mockReturnValue('/test/dir');
    filePathUtilsMock.getGslothFilePath.mockReturnValue('test-file-path.md');
    utilsMock.generateStandardFileName.mockReturnValue('test-filename.md');
    llmUtilsMock.invoke.mockResolvedValue('LLM Review Response');
  });

  it('should create and use ReadFileTool with the current directory', async () => {
    // Import the module after setting up mocks
    const { review } = await import('#src/modules/reviewModule.js');

    // Call the review function
    await review('test-source', 'test-preamble', 'test-diff');

    // Verify that getCurrentDir was called to get the base path for the file store
    expect(systemUtilsMock.getCurrentDir).toHaveBeenCalled();

    // Verify NodeFileStore was initialized with the correct directory
    expect(langchainStoresFileNode.NodeFileStore).toHaveBeenCalledWith('/test/dir');

    // Verify that the tool was passed to invoke
    expect(llmUtilsMock.invoke).toHaveBeenCalledWith(
      mockSlothContext.config.llm,
      mockSlothContext.session,
      expect.stringContaining('test-preamble'),
      'test-diff',
      expect.any(Array)
    );

    // Verify that the preamble includes instructions for using the tool
    const preambleArg = llmUtilsMock.invoke.mock.calls[0][2];
    expect(preambleArg).toContain('You have access to a tool');
    expect(preambleArg).toContain('read_file');
    expect(preambleArg).toContain('Read file from disk');
  });

  it('should write the LLM response to a file', async () => {
    // Import the module after setting up mocks
    const { review } = await import('#src/modules/reviewModule.js');

    // Call the review function
    await review('test-source', 'test-preamble', 'test-diff');

    // Verify that writeFileSync was called with the correct parameters
    expect(fsMock.writeFileSync).toHaveBeenCalledWith('test-file-path.md', 'LLM Review Response');

    // Verify that success message was displayed
    expect(consoleUtilsMock.displaySuccess).toHaveBeenCalledWith(
      expect.stringContaining('test-file-path.md')
    );
  });
});
