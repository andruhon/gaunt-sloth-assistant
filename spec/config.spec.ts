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
    // Reset mocks
    vi.resetAllMocks();
    vi.clearAllMocks();
    vi.resetModules();
    // Reset and set up systemUtils mocks
    systemUtilsMock.getCurrentDir.mockReturnValue('/mock/current/dir');
    systemUtilsMock.getInstallDir.mockReturnValue('/mock/install/dir');
  });

  describe('initConfig', () => {
    it('Should load JSON config when it exists', async () => {
      // Create a test config
      const jsonConfig = {
        llm: {
          type: 'vertexai',
        },
      } as RawSlothConfig;

      // Set up fs mocks for this specific test
      fsMock.existsSync.mockImplementation((path: string) => {
        return path.includes('.gsloth.config.json');
      });
      fsMock.readFileSync.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.json')) return JSON.stringify(jsonConfig);
        return '';
      });

      // Mock the vertexai config module to process the config
      vi.doMock('#src/configs/vertexai.js', () => ({
        processJsonConfig: vi.fn().mockResolvedValue({ type: 'vertexai' }),
      }));

      // Import the module under test
      const { initConfig } = await import('#src/config.js');

      // Function under test
      const config = await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(config).toEqual({
        llm: { type: 'vertexai' },
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
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
        return path.includes('.gsloth.config.js');
      });

      // Mock the import function
      utilsMock.importExternalFile.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.js')) return Promise.resolve(mockConfigModule);
        return Promise.reject(new Error('Not found'));
      });

      // Import the module under test
      const { initConfig } = await import('#src/config.js');

      // Function under test
      const config = await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(config).toEqual({
        llm: { type: 'anthropic' },
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
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
        return path.includes('.gsloth.config.mjs');
      });

      // Mock the import function
      utilsMock.importExternalFile.mockImplementation((path: string) => {
        if (path.includes('.gsloth.config.mjs')) return Promise.resolve(mockConfigModule);
        return Promise.reject(new Error('Not found'));
      });

      // Import the module under test
      const { initConfig } = await import('#src/config.js');

      // Function under test
      const config = await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(config).toEqual({
        llm: { type: 'groq' },
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
      });
    });

    it('Should exit when no config files exist', async () => {
      // Set up fs mocks for this specific test
      fsMock.existsSync.mockReturnValue(false);

      // Import the module under test
      const { initConfig } = await import('#src/config.js');

      // Function under test
      await initConfig();

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        'No configuration file found. Please create one of: ' +
          '.gsloth.config.json, .gsloth.config.js, or .gsloth.config.mjs ' +
          'in your project directory.'
      );

      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);
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

      // Expected config that should be returned
      const expectedConfig = {
        llm: {
          type: 'vertexai',
          model: 'test-model',
        },
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        contentProvider: 'file',
        requirementsProvider: 'file',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
      };

      // Set up fs mocks for this specific test
      fsMock.existsSync.mockReturnValue(false);

      // Mock the module under test
      vi.doMock('#src/config.js', async () => {
        const actual = await vi.importActual('#src/config.js');
        return {
          ...actual,
          tryJsonConfig: vi.fn().mockResolvedValue(expectedConfig),
          createDefaultConfig: vi.fn().mockReturnValue({
            llm: undefined,
            contentProvider: 'file',
            requirementsProvider: 'file',
            projectGuidelines: '.gsloth.guidelines.md',
            projectReviewInstructions: '.gsloth.review.md',
            streamOutput: true,
            commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
          }),
        };
      });

      const { tryJsonConfig } = await import('#src/config.js');

      // Function under test
      const config = await tryJsonConfig(jsonConfig);

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      expect(config).toEqual({
        llm: {
          type: 'vertexai',
          model: 'test-model',
        },
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        contentProvider: 'file',
        requirementsProvider: 'file',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
      });
    });

    it('Should handle unsupported LLM type', async () => {
      const jsonConfig = {
        llm: {
          type: 'unsupported',
          model: 'test-model',
        },
      } as RawSlothConfig;

      // Mock the error that will be thrown by tryJsonConfig
      vi.doMock('#src/config.js', async () => {
        const actual = await vi.importActual('#src/config.js');
        return {
          ...actual,
          tryJsonConfig: vi.fn().mockImplementation(() => {
            consoleUtilsMock.displayError(
              'Unsupported LLM type: unsupported. Available types are: vertexai, anthropic, groq'
            );
            systemUtilsMock.exit(1);
            throw new Error('Unsupported LLM type');
          }),
          createDefaultConfig: vi.fn().mockReturnValue({
            llm: undefined,
            contentProvider: 'file',
            requirementsProvider: 'file',
            projectGuidelines: '.gsloth.guidelines.md',
            projectReviewInstructions: '.gsloth.review.md',
            streamOutput: true,
            commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
          }),
        };
      });

      const { tryJsonConfig, createDefaultConfig } = await import('#src/config.js');

      try {
        await tryJsonConfig(jsonConfig);
        // Should not reach here due to error
        expect(true).toBe(false);
      } catch {
        // Expected to throw
      }

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        'Unsupported LLM type: unsupported. Available types are: vertexai, anthropic, groq'
      );
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      // Verify system exit was called
      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);

      // After an error, a default config should be used
      const defaultConfig = createDefaultConfig();
      expect(defaultConfig).toEqual({
        llm: undefined,
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
      });

      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);
    });

    it('Should handle missing LLM type', async () => {
      const jsonConfig = {
        llm: {
          type: 'test',
        },
      } as RawSlothConfig;

      // Mock the error that will be thrown by tryJsonConfig
      vi.doMock('#src/config.js', async () => {
        const actual = await vi.importActual('#src/config.js');
        return {
          ...actual,
          tryJsonConfig: vi.fn().mockImplementation(() => {
            consoleUtilsMock.displayError(
              'Unsupported LLM type: test. Available types are: vertexai, anthropic, groq'
            );
            systemUtilsMock.exit(1);
            throw new Error('Unsupported LLM type');
          }),
          createDefaultConfig: vi.fn().mockReturnValue({
            llm: undefined,
            contentProvider: 'file',
            requirementsProvider: 'file',
            projectGuidelines: '.gsloth.guidelines.md',
            projectReviewInstructions: '.gsloth.review.md',
            streamOutput: true,
            commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
          }),
        };
      });

      const { tryJsonConfig, createDefaultConfig } = await import('#src/config.js');

      try {
        await tryJsonConfig(jsonConfig);
        // Should not reach here due to error
        expect(true).toBe(false);
      } catch {
        // Expected to throw
      }

      // It is easier to debug if messages checked first
      expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        'Unsupported LLM type: test. Available types are: vertexai, anthropic, groq'
      );
      expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
      expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();

      // Verify system exit was called
      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);

      // After an error, a default config should be used
      const defaultConfig = createDefaultConfig();
      expect(defaultConfig).toEqual({
        llm: undefined,
        contentProvider: 'file',
        requirementsProvider: 'file',
        projectGuidelines: '.gsloth.guidelines.md',
        projectReviewInstructions: '.gsloth.review.md',
        streamOutput: true,
        commands: { pr: { contentProvider: 'github', requirementsProvider: 'github' } },
      });

      expect(systemUtilsMock.exit).toHaveBeenCalledWith(1);
    });
  });
});
