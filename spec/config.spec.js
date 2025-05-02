import * as td from 'testdouble';

describe('config', function () {

    const ctx = {
        consoleUtilsMock: {
            display: td.function(),
            displayError: td.function(),
            displayInfo: td.function(),
            displayWarning: td.function(),
            displaySuccess: td.function(),
            displayDebug: td.function()
        },
        fsMock: {
            existsSync: td.function(),
            readFileSync: td.function(),
            writeFileSync: td.function(),
            default: {
                existsSync: td.function(),
                readFileSync: td.function(),
                writeFileSync: td.function()
            }
        },
        urlMock: {
            pathToFileURL: td.function(),
            default: {
                pathToFileURL: td.function()
            }
        },
        utilsMock: {
            writeFileIfNotExistsWithMessages: td.function(),
            importExternalFile: td.function(),
            importFromFilePath: td.function(),
            ProgressIndicator: td.constructor(),
            fileSafeLocalDate: td.function(),
            toFileSafeString: td.function(),
            extractLastMessageContent: td.function(),
            readFileSyncWithMessages: td.function()
        },
        systemUtilsMock: {
            exit: td.function(),
            getCurrentDir: td.function(),
            getInstallDir: td.function(),
        }
    };

    beforeEach(async function () {

        // Reset testdouble before each test
        td.reset();

        // Set up specific fs mocks - use td.matchers.contains to match any path containing the config file name
        td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
        td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(false);
        td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.mjs'))).thenReturn(false);

        // Set up the same mocks for the default export of fs
        td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
        td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(false);
        td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.mjs'))).thenReturn(false);

        // Set up specific url mocks - use Windows-style paths for file URLs
        const jsonFileUrl = 'file:////mock/current/dir/.gsloth.config.json';
        const jsFileUrl = 'file:////mock/current/dir/.gsloth.config.js';
        const mjsFileUrl = 'file:////mock/current/dir/.gsloth.config.mjs';

        td.when(ctx.urlMock.pathToFileURL('/mock/current/dir/.gsloth.config.json')).thenReturn(jsonFileUrl);
        td.when(ctx.urlMock.pathToFileURL('/mock/current/dir/.gsloth.config.js')).thenReturn(jsFileUrl);
        td.when(ctx.urlMock.pathToFileURL('/mock/current/dir/.gsloth.config.mjs')).thenReturn(mjsFileUrl);

        // Set up the same mocks for the default export of url
        td.when(ctx.urlMock.default.pathToFileURL('/mock/current/dir/.gsloth.config.json')).thenReturn(jsonFileUrl);
        td.when(ctx.urlMock.default.pathToFileURL('/mock/current/dir/.gsloth.config.js')).thenReturn(jsFileUrl);
        td.when(ctx.urlMock.default.pathToFileURL('/mock/current/dir/.gsloth.config.mjs')).thenReturn(mjsFileUrl);

        td.when(ctx.systemUtilsMock.getInstallDir()).thenReturn("/mock/install/dir");
        td.when(ctx.systemUtilsMock.getCurrentDir()).thenReturn("/mock/current/dir");

        // Replace modules with mocks
        await td.replaceEsm('node:fs', ctx.fsMock);
        await td.replaceEsm('node:url', ctx.urlMock);
        await td.replaceEsm('../src/consoleUtils.js', ctx.consoleUtilsMock);
        await td.replaceEsm('./consoleUtils.js', ctx.consoleUtilsMock);
        await td.replaceEsm('../src/utils.js', ctx.utilsMock);
        await td.replaceEsm('../src/systemUtils.js', ctx.systemUtilsMock);
        await td.replaceEsm('./systemUtils.js', ctx.systemUtilsMock);
    });

    describe('initConfig', function () {
        it('Should load JSON config when it exists', async function () {
            const jsonConfig = {llm: {type: 'vertexai'}};

            td.when(
                ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.json'))
            ).thenReturn(true);
            td.when(
                ctx.fsMock.readFileSync(td.matchers.contains('.gsloth.config.json'), 'utf8')
            ).thenReturn(JSON.stringify(jsonConfig));
            td.when(
                ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.json'))
            ).thenReturn(true);
            td.when(
                ctx.fsMock.default.readFileSync(td.matchers.contains('.gsloth.config.json'), 'utf8')
            ).thenReturn(JSON.stringify(jsonConfig));
            await td.replaceEsm('../src/configs/vertexai.js', {});
            const {initConfig, slothContext} = await import('../src/config.js');

            // Function under test
            await initConfig();

            expect(slothContext.config).toEqual({
                llm: {type: 'vertexai'},
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: {pr: {contentProvider: 'gh'}}
            });

            td.verify(ctx.consoleUtilsMock.displayWarning(
                "Config module for vertexai does not have processJsonConfig function."
            ));
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });

        it('Should try JS config when JSON config does not exist', async function () {
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(true);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(true);

            // Mock the import function
            const mockConfigModule = {
                configure: td.function()
            };
            const mockConfig = {llm: {type: 'anthropic'}};
            td.when(mockConfigModule.configure(td.matchers.anything())).thenResolve(mockConfig);

            td.when(
                ctx.utilsMock.importExternalFile(td.matchers.contains('.gsloth.config.js'))
            ).thenResolve(mockConfigModule);

            const {initConfig, slothContext} = await import('../src/config.js');

            // Function under test
            await initConfig();

            expect(slothContext.config).toEqual({
                llm: {type: 'anthropic'},
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: {pr: {contentProvider: 'gh'}}
            });
            td.verify(ctx.consoleUtilsMock.displayDebug(
                td.matchers.argThat((e) => String(e).includes("is not valid JSON")))
            );
            td.verify(ctx.consoleUtilsMock.displayError(
                "Failed to read config from .gsloth.config.json, will try other formats."
            ));
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });

        it('Should try MJS config when JSON and JS configs do not exist', async function () {
            // Setup mocks for MJS config
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(false);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(false);
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.mjs'))).thenReturn(true);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.mjs'))).thenReturn(true);

            const mockConfigModule = {
                configure: td.function()
            };
            const mockConfig = {llm: {type: 'groq'}};
            td.when(mockConfigModule.configure(td.matchers.anything())).thenResolve(mockConfig);

            td.when(
                ctx.utilsMock.importExternalFile(td.matchers.contains('.gsloth.config.mjs'))
            ).thenResolve(mockConfigModule);

            const {initConfig, slothContext} = await import('../src/config.js');

            // Function under test
            await initConfig();

            expect(slothContext.config).toEqual({
                llm: {type: 'groq'},
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: {pr: {contentProvider: 'gh'}}
            });
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });

        it('Should exit when no config files exist', async function () {
            // Setup mocks for no config files
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.json'))).thenReturn(false);
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(false);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.js'))).thenReturn(false);
            td.when(ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.mjs'))).thenReturn(false);
            td.when(ctx.fsMock.default.existsSync(td.matchers.contains('.gsloth.config.mjs'))).thenReturn(false);

            const {initConfig} = await import('../src/config.js');

            // Function under test
            await initConfig();

            // Verify process.exit was called
            td.verify(ctx.systemUtilsMock.exit());

            // Verify no message was displayed
            td.verify(ctx.consoleUtilsMock.displayError(
                "No configuration file found. Please create one of: " +
                ".gsloth.config.json, .gsloth.config.js, or .gsloth.config.mjs " +
                "in your project directory."
            ));
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });
    });

    describe('processJsonLlmConfig', function () {
        it('Should process valid LLM type', async function () {
            // Create a test config
            const jsonConfig = {
                llm: {
                    type: 'vertexai',
                    model: 'test-model'
                }
            };
            const processJsonConfig = td.function();
            await td.replaceEsm('../src/configs/vertexai.js', {
                processJsonConfig
            });
            td.when(processJsonConfig(jsonConfig.llm)).thenReturn(jsonConfig.llm);
            const {tryJsonConfig, slothContext} = await import('../src/config.js');

            // Call the function
            await tryJsonConfig(jsonConfig);

            // Verify the config was set correctly
            expect(slothContext.config.llm.type).toBe('vertexai');

            // Verify no message was displayed
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });

        it('Should handle invalid LLM type', async function () {
            const jsonConfig = {
                llm: {
                    type: 'invalid-type',
                    model: 'test-model'
                }
            };

            const {tryJsonConfig, slothContext} = await import('../src/config.js');

            // Function under test
            await tryJsonConfig(jsonConfig);

            expect(slothContext.config).toEqual({
                llm: { type: 'invalid-type', model: 'test-model' },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });

            td.verify(ctx.consoleUtilsMock.displayError(
                "Unsupported LLM type: invalid-type. Available types are: vertexai, anthropic, groq"
            ));
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });

        it('Should handle import errors', async function () {
            const jsonConfig = {
                llm: {
                    type: 'vertexai',
                    model: 'test-model'
                }
            };
            const {tryJsonConfig, slothContext} = await import('../src/config.js');

            await tryJsonConfig(jsonConfig);

            expect(slothContext.config).toEqual({
                llm: { type: 'vertexai', model: 'test-model' },
                contentProvider: 'file',
                requirementsProvider: 'file',
                commands: { pr: { contentProvider: 'gh' } }
            });


            td.verify(ctx.consoleUtilsMock.displayWarning(
                td.matchers.contains("Could not import config module for vertexai"))
            );
            td.verify(ctx.consoleUtilsMock.displayDebug(
                td.matchers.argThat((e) => String(e).includes("Error: Unable to verify model params")))
            );
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });
    });

    describe('createProjectConfig', function () {
        it('Should create config for valid config type', async function () {
            const {createProjectConfig, slothContext} = await import('../src/config.js');

            slothContext.currentDir = '/mock/current/dir/';

            // Function under test
            await createProjectConfig('vertexai');

            td.verify(ctx.utilsMock.writeFileIfNotExistsWithMessages(
                "/mock/current/dir/.gsloth.preamble.review.md",
                td.matchers.contains(
                    "You are doing generic code review.\n" +
                    " Important! Please remind user to prepare proper AI preamble in.gsloth.preamble.review.md" +
                    " for this project. Use decent amount of ⚠️ to highlight lack of config." +
                    " Explicitly mention `.gsloth.preamble.review.md`."
                )
            ));

            td.verify(ctx.utilsMock.writeFileIfNotExistsWithMessages(
                ".gsloth.config.json",
                td.matchers.contains(`"type": "vertexai"`)
            ));

            td.verify(ctx.consoleUtilsMock.displayInfo(
                td.matchers.contains("Setting up your project")
            ), {times: 1});
            td.verify(ctx.consoleUtilsMock.displayInfo(
                td.matchers.contains("Creating project config for vertexai")
            ), {times: 1});
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.contains(
                "Make sure you add as much detail as possible to your .gsloth.preamble.review.md."
            )));
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });

        it('Should handle invalid config type', async function () {
            const {createProjectConfig, slothContext} = await import('../src/config.js');
            slothContext.currentDir = '/mock/current/dir/';

            // Function under test
            await createProjectConfig('invalid-type');

            td.verify(ctx.systemUtilsMock.exit(1));
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.contains(
                "Setting up your project"
            )));
            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.contains(
                "Make sure you add as much detail as possible to your .gsloth.preamble.review.md."
            )));
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.contains(
                "Unsupported config type: invalid-type. Available types are: vertexai, anthropic, groq"
            )));
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });
    });

    describe('writeProjectReviewPreamble', function () {
        it('Should write project review preamble', async function () {
            // Create a mock for writeFileIfNotExistsWithMessages
            const writeFileIfNotExistsWithMessagesMock = td.function();

            // Update the utils mock with our mock
            ctx.utilsMock.writeFileIfNotExistsWithMessages = writeFileIfNotExistsWithMessagesMock;

            const {writeProjectReviewPreamble, slothContext} = await import('../src/config.js');

            slothContext.currentDir = '/mock/current/dir/';

            // Call the function
            writeProjectReviewPreamble();

            // Verify writeFileIfNotExistsWithMessages was called with the correct arguments
            td.verify(writeFileIfNotExistsWithMessagesMock(
                '/mock/current/dir/.gsloth.preamble.review.md',
                td.matchers.anything()
            ));

            td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayDebug(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.display(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displayInfo(td.matchers.anything()), {times: 0});
            td.verify(ctx.consoleUtilsMock.displaySuccess(td.matchers.anything()), {times: 0});
        });
    });
});
