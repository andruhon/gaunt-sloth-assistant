import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawSlothConfig } from '#src/config.js';

const fsMock = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
};
vi.mock('node:fs', () => fsMock);

const urlMock = {
  pathToFileURL: vi.fn(),
};
vi.mock('node:url', () => urlMock);

const consoleUtilsMock = {
  display: vi.fn(),
  displayError: vi.fn(),
  displayInfo: vi.fn(),
  displayWarning: vi.fn(),
  displaySuccess: vi.fn(),
  displayDebug: vi.fn(),
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

const utilsMock = {
  writeFileIfNotExistsWithMessages: vi.fn(),
  importExternalFile: vi.fn(),
  importFromFilePath: vi.fn(),
  ProgressIndicator: vi.fn(),
  fileSafeLocalDate: vi.fn(),
  toFileSafeString: vi.fn(),
  extractLastMessageContent: vi.fn(),
  readFileSyncWithMessages: vi.fn(),
};
vi.mock('#src/utils.js', () => utilsMock);

const systemUtilsMock = {
  exit: vi.fn(),
  getCurrentDir: vi.fn(),
  getInstallDir: vi.fn(),
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

describe('config', async () => {
  beforeEach(async () => {
    // Reset slothContext to default state instead of deleting all properties
    vi.resetAllMocks();
    // Reset and set up systemUtils mocks
    systemUtilsMock.getCurrentDir.mockReturnValue('/mock/current/dir');
    systemUtilsMock.getInstallDir.mockReturnValue('/mock/install/dir');

    // Set up specific fs mocks - use vi.mocked to match any path containing the config file name
    fsMock.existsSync.mockImplementation((path: string) => {
      if (path.includes('.gsloth.config.json')) return false;
      if (path.includes('.gsloth.config.js')) return false;
      if (path.includes('.gsloth.config.mjs')) return false;
      return false;
    });

    // Set up specific url mocks - use Windows-style paths for file URLs
    const jsonFileUrl = 'file:////mock/current/dir/.gsloth.config.json';
    const jsFileUrl = 'file:////mock/current/dir/.gsloth.config.js';
    const mjsFileUrl = 'file:////mock/current/dir/.gsloth.config.mjs';

    urlMock.pathToFileURL.mockImplementation((path: string) => {
      if (path.includes('.gsloth.config.json')) return jsonFileUrl;
      if (path.includes('.gsloth.config.js')) return jsFileUrl;
      if (path.includes('.gsloth.config.mjs')) return mjsFileUrl;
      return '';
    });
  });

  describe('initConfig', async () => {
    it('Should load JSON config when it exists', async () => {
      const jsonConfig = { llm: { type: 'vertexai' } };

      // Set up fs mocks for this specific test
      fsMock.existsSync.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.json')) return true;
        return false;
      });
      fsMock.readFileSync.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.json')) return JSON.stringify(jsonConfig);
        return '';
      });

      // Mock the vertexai config module
      vi.mock('#src/configs/vertexai.js', () => ({
        processJsonConfig: (v: any) => v,
      }));

      // Import the module under test
      const { initConfig, slothContext, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(slothContext.config).toEqual({
        llm: { type: 'vertexai' },
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        commands: { pr: { contentProvider: 'github' } },
      });
    });

    it('Should try JS config when JSON config does not exist', async () => {
      const mockConfigModule = {
        configure: vi.fn(),
      };
      const mockConfig = { llm: { type: 'anthropic' } };
      mockConfigModule.configure.mockResolvedValue(mockConfig);

      // Set up fs mocks for this specific test
      fsMock.existsSync.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.json')) return false;
        if (path.includes('.gsloth.config.js')) return true;
        return false;
      });

      // Mock the import function
      utilsMock.importExternalFile.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.js')) return Promise.resolve(mockConfigModule);
        return Promise.reject(new Error('Not found'));
      });

      // Mock the anthropic config module
      vi.mock('#src/configs/anthropic.js', () => ({
        processJsonConfig: () => mockConfig,
      }));

      // Import the module under test
      const { initConfig, slothContext, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(slothContext.config).toEqual({
        llm: { type: 'anthropic' },
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        commands: { pr: { contentProvider: 'github' } },
      });
    });

    it('Should try MJS config when JSON and JS configs do not exist', async () => {
      const mockConfigModule = {
        configure: vi.fn(),
      };
      const mockConfig = { llm: { type: 'groq' } };
      mockConfigModule.configure.mockResolvedValue(mockConfig);

      // Set up fs mocks for this specific test
      fsMock.existsSync.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.json')) return false;
        if (path.includes('.gsloth.config.js')) return false;
        if (path.includes('.gsloth.config.mjs')) return true;
        return false;
      });

      // Mock the import function
      utilsMock.importExternalFile.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.mjs')) return Promise.resolve(mockConfigModule);
        return Promise.reject(new Error('Not found'));
      });

      // Mock the groq config module
      vi.mock('#src/configs/groq.js', () => ({
        processJsonConfig: (v: any) => v,
      }));

      // Import the module under test
      const { initConfig, slothContext, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(slothContext.config).toEqual({
        llm: { type: 'groq' },
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        commands: { pr: { contentProvider: 'github' } },
      });
    });

    it('Should exit when no config files exist', async () => {
      // Set up fs mocks for this specific test
      fsMock.existsSync.mockImplementation((_path: string) => false);

      // Import the module under test
      const { initConfig, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        'No configuration file found. Please create one of: ' +
          '.gsloth.config.json, .gsloth.config.js, or .gsloth.config.mjs ' +
          'in your project directory.'
      );
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      // Verify process.exit was called
      expect(systemUtilsMock.exit).toHaveBeenCalled();
    });
  });

  describe('processJsonLlmConfig', () => {
    it('Should process valid LLM type', async () => {
      // Create a test config
      const jsonConfig = {
        llm: {
          type: 'vertexai',
          model: 'test-model',
        },
      } as RawSlothConfig;

      const { tryJsonConfig, slothContext, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await tryJsonConfig(jsonConfig);

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(slothContext.config).toEqual({
        llm: {
          type: 'vertexai',
          model: 'test-model',
        },
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        contentProvider: 'file',
        requirementsProvider: 'file',
        commands: { pr: { contentProvider: 'github' } },
      });
    });

    it('Should handle unsupported LLM type', async () => {
      const jsonConfig = {
        llm: {
          type: 'unsupported',
          model: 'test-model',
        },
      } as RawSlothConfig;

      const { tryJsonConfig, slothContext, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await tryJsonConfig(jsonConfig);

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        'Unsupported LLM type: unsupported. Available types are: vertexai, anthropic, groq'
      );
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(slothContext.config, 'Should retain default config').toEqual({
        llm: undefined,
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        commands: { pr: { contentProvider: 'github' } },
      });

      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);
    });

    it('Should handle missing LLM type', async () => {
      const jsonConfig = {
        llm: {
          type: 'test',
          model: 'test-model',
        },
      } as RawSlothConfig;

      const { tryJsonConfig, slothContext, reset } = await import('#src/config.js');
      reset();

      // Function under test
      await tryJsonConfig(jsonConfig);

      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        'Unsupported LLM type: test. Available types are: vertexai, anthropic, groq'
      );
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(slothContext.config, 'Should retain default config').toEqual({
        llm: undefined,
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        commands: { pr: { contentProvider: 'github' } },
      });

      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);
    });
  });
});
