import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentDir } from '../src/systemUtils.js';

// Mock declarations must be at the top level
vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    default: {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn()
    }
}));

vi.mock('node:url', () => ({
    pathToFileURL: vi.fn(),
    default: {
        pathToFileURL: vi.fn()
    }
}));

vi.mock('../src/consoleUtils.js', () => ({
    display: vi.fn(),
    displayError: vi.fn(),
    displayInfo: vi.fn(),
    displayWarning: vi.fn(),
    displaySuccess: vi.fn(),
    displayDebug: vi.fn()
}));

vi.mock('./consoleUtils.js', () => ({
    display: vi.fn(),
    displayError: vi.fn(),
    displayInfo: vi.fn(),
    displayWarning: vi.fn(),
    displaySuccess: vi.fn(),
    displayDebug: vi.fn()
}));

vi.mock('../src/utils.js', () => ({
    writeFileIfNotExistsWithMessages: vi.fn(),
    importExternalFile: vi.fn(),
    importFromFilePath: vi.fn(),
    ProgressIndicator: vi.fn(),
    fileSafeLocalDate: vi.fn(),
    toFileSafeString: vi.fn(),
    extractLastMessageContent: vi.fn(),
    readFileSyncWithMessages: vi.fn()
}));

vi.mock('../src/systemUtils.js', () => ({
    exit: vi.fn(),
    getCurrentDir: vi.fn(),
    getInstallDir: vi.fn()
}));

vi.mock('./systemUtils.js', () => ({
    exit: vi.fn(),
    getCurrentDir: vi.fn(),
    getInstallDir: vi.fn()
}));

describe('config', () => {
    const consoleUtilsMock = {
        display: vi.fn(),
        displayError: vi.fn(),
        displayInfo: vi.fn(),
        displayWarning: vi.fn(),
        displaySuccess: vi.fn(),
        displayDebug: vi.fn()
    };

    const fsMock = {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        default: {
            existsSync: vi.fn(),
            readFileSync: vi.fn(),
            writeFileSync: vi.fn()
        }
    };

    const urlMock = {
        pathToFileURL: vi.fn(),
        default: {
            pathToFileURL: vi.fn()
        }
    };

    const utilsMock = {
        writeFileIfNotExistsWithMessages: vi.fn(),
        importExternalFile: vi.fn(),
        importFromFilePath: vi.fn(),
        ProgressIndicator: vi.fn(),
        fileSafeLocalDate: vi.fn(),
        toFileSafeString: vi.fn(),
        extractLastMessageContent: vi.fn(),
        readFileSyncWithMessages: vi.fn()
    };

    const systemUtilsMock = {
        exit: vi.fn(),
        getCurrentDir: vi.fn(),
        getInstallDir: vi.fn()
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        // Set up specific fs mocks - use vi.mocked to match any path containing the config file name
        fsMock.existsSync.mockImplementation((path: string) => {
            if (path.includes('.gsloth.config.json')) return false;
            if (path.includes('.gsloth.config.js')) return false;
            if (path.includes('.gsloth.config.mjs')) return false;
            return false;
        });

        // Set up the same mocks for the default export of fs
        fsMock.default.existsSync.mockImplementation((path: string) => {
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

        // Set up the same mocks for the default export of url
        urlMock.default.pathToFileURL.mockImplementation((path: string) => {
            if (path.includes('.gsloth.config.json')) return jsonFileUrl;
            if (path.includes('.gsloth.config.js')) return jsFileUrl;
            if (path.includes('.gsloth.config.mjs')) return mjsFileUrl;
            return '';
        });

        systemUtilsMock.getInstallDir.mockReturnValue("/mock/install/dir");
        systemUtilsMock.getCurrentDir.mockReturnValue("/mock/current/dir");

        // Ensure the mock is properly set up for both the module and its default export
        vi.mocked(getCurrentDir).mockReturnValue("/mock/current/dir");
    });

    describe('initConfig', () => {
        it.only('Should load JSON config when it exists', async () => {
            const jsonConfig = { llm: { type: 'vertexai' } };

            fsMock.existsSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return true;
                return false;
            });
            fsMock.readFileSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return JSON.stringify(jsonConfig);
                return '';
            });
            fsMock.default.existsSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return true;
                return false;
            });
            fsMock.default.readFileSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return JSON.stringify(jsonConfig);
                return '';
            });

            vi.mock('../src/configs/vertexai.js', () => ({}));
            const { initConfig, slothContext } = await import('../src/config.js');

            // Function under test
            await initConfig();

            expect(slothContext.config).toEqual({
                llm: { type: 'vertexai' },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });

            expect(consoleUtilsMock.displayWarning).toHaveBeenCalledWith(
                "Config module for vertexai does not have processJsonConfig function."
            );
            expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
            expect(consoleUtilsMock.display).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();
        });

        it('Should try JS config when JSON config does not exist', async () => {
            fsMock.existsSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return false;
                if (path.includes('.gsloth.config.js')) return true;
                return false;
            });
            fsMock.default.existsSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return false;
                if (path.includes('.gsloth.config.js')) return true;
                return false;
            });

            // Mock the import function
            const mockConfigModule = {
                configure: vi.fn()
            };
            const mockConfig = { llm: { type: 'anthropic' } };
            mockConfigModule.configure.mockResolvedValue(mockConfig);

            utilsMock.importExternalFile.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.js')) return Promise.resolve(mockConfigModule);
                return Promise.reject(new Error('Not found'));
            });

            const { initConfig, slothContext } = await import('../src/config.js');

            // Function under test
            await initConfig();

            expect(slothContext.config).toEqual({
                llm: { type: 'anthropic' },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });

            expect(consoleUtilsMock.displayDebug).toHaveBeenCalledWith(
                expect.stringContaining("is not valid JSON")
            );
            expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
                "Failed to read config from .gsloth.config.json, will try other formats."
            );
            expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
            expect(consoleUtilsMock.display).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();
        });

        it('Should try MJS config when JSON and JS configs do not exist', async () => {
            // Setup mocks for MJS config
            fsMock.existsSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return false;
                if (path.includes('.gsloth.config.js')) return false;
                if (path.includes('.gsloth.config.mjs')) return true;
                return false;
            });
            fsMock.default.existsSync.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.json')) return false;
                if (path.includes('.gsloth.config.js')) return false;
                if (path.includes('.gsloth.config.mjs')) return true;
                return false;
            });

            const mockConfigModule = {
                configure: vi.fn()
            };
            const mockConfig = { llm: { type: 'groq' } };
            mockConfigModule.configure.mockResolvedValue(mockConfig);

            utilsMock.importExternalFile.mockImplementation((path: string) => {
                if (path.includes('.gsloth.config.mjs')) return Promise.resolve(mockConfigModule);
                return Promise.reject(new Error('Not found'));
            });

            const { initConfig, slothContext } = await import('../src/config.js');

            // Function under test
            await initConfig();

            expect(slothContext.config).toEqual({
                llm: { type: 'groq' },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });

            expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
            expect(consoleUtilsMock.display).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();
        });

        it('Should exit when no config files exist', async () => {
            // Setup mocks for no config files
            fsMock.existsSync.mockReturnValue(false);
            fsMock.default.existsSync.mockReturnValue(false);

            const { initConfig } = await import('../src/config.js');

            // Function under test
            await initConfig();

            // Verify process.exit was called
            expect(systemUtilsMock.exit).toHaveBeenCalled();

            // Verify no message was displayed
            expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
                "No configuration file found. Please create one of: " +
                ".gsloth.config.json, .gsloth.config.js, or .gsloth.config.mjs " +
                "in your project directory."
            );
            expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
            expect(consoleUtilsMock.display).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
            expect(consoleUtilsMock.displaySuccess).not.toHaveBeenCalled();
        });
    });

    describe('processJsonLlmConfig', () => {
        it('Should process valid LLM type', async () => {
            // Create a test config
            const jsonConfig = {
                llm: {
                    type: 'vertexai',
                    model: 'test-model'
                }
            };
            const processJsonConfig = vi.fn();
            vi.mock('../src/configs/vertexai.js', () => ({
                processJsonConfig
            }));
            processJsonConfig.mockReturnValue(jsonConfig.llm);

            const { tryJsonConfig, slothContext } = await import('../src/config.js');

            // Function under test
            await tryJsonConfig(jsonConfig);

            expect(slothContext.config).toEqual({
                llm: {
                    type: 'vertexai',
                    model: 'test-model'
                },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });
        });

        it('Should handle unsupported LLM type', async () => {
            const jsonConfig = {
                llm: {
                    type: 'unsupported',
                    model: 'test-model'
                }
            };

            // Mock console utils
            const { displayError } = await import('../src/consoleUtils.js');
            vi.mocked(displayError).mockImplementation(vi.fn());

            const { tryJsonConfig, slothContext } = await import('../src/config.js');

            // Function under test
            await tryJsonConfig(jsonConfig);

            expect(slothContext.config).toEqual({
                llm: {
                    type: 'unsupported',
                    model: 'test-model'
                },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });

            expect(displayError).toHaveBeenCalledWith(
                'Unsupported LLM type: unsupported. Available types are: vertexai, anthropic, groq'
            );
        });

        it('Should handle missing LLM type', async () => {
            const jsonConfig = {
                llm: {
                    model: 'test-model'
                }
            };

            // Mock console utils
            const { displayError } = await import('../src/consoleUtils.js');
            vi.mocked(displayError).mockImplementation(vi.fn());

            const { tryJsonConfig, slothContext } = await import('../src/config.js');

            // Function under test
            await tryJsonConfig(jsonConfig);

            expect(slothContext.config).toEqual({
                llm: {
                    model: 'test-model'
                },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });

            expect(displayError).toHaveBeenCalledWith(
                'Unsupported LLM type: undefined. Available types are: vertexai, anthropic, groq'
            );
        });
    });
}); 