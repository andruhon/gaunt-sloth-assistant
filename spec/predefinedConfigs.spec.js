import * as td from "testdouble";


describe('predefined AI provider configurations', function () {

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
        }
    };

    beforeEach(async function () {
        td.reset();
        await td.replaceEsm('node:fs', ctx.fsMock);
        await td.replaceEsm('../src/consoleUtils.js', ctx.consoleUtilsMock);
        await td.replaceEsm('./consoleUtils.js', ctx.consoleUtilsMock);
    });

    it('Should import predefined Anthropic config correctly', async function () {
        // Mock the Anthropic module and its import
        const mockChat = td.constructor();
        const mockChatInstance = {};
        td.when(mockChat(td.matchers.anything())).thenReturn(mockChatInstance);
        await td.replaceEsm('@langchain/anthropic', {
            ChatAnthropic: mockChat
        });

        await testPredefinedAiConfig('anthropic', mockChatInstance);
    });

    it('Should import predefined VertexAI config correctly', async function () {
        // Mock the Anthropic module and its import
        const mockChat = td.constructor();
        const mockChatInstance = {};
        td.when(mockChat(td.matchers.anything())).thenReturn(mockChatInstance);
        await td.replaceEsm('@langchain/google-vertexai', {
            ChatVertexAI: mockChat
        });

        await testPredefinedAiConfig('vertexai', mockChatInstance);
    });

    it('Should import predefined Groq config correctly', async function () {
        // Mock the Anthropic module and its import
        const mockChat = td.constructor();
        const mockChatInstance = {};
        td.when(mockChat(td.matchers.anything())).thenReturn(mockChatInstance);
        await td.replaceEsm('@langchain/groq', {
            ChatGroq: mockChat
        });

        await testPredefinedAiConfig('groq', mockChatInstance);
    });

    async function testPredefinedAiConfig(aiProvider, mockAnthropicInstance) {
        const jsonConfig = {
            llm: {
                type: aiProvider,
                model: 'claude-3-5-sonnet-20241022',
                apiKey: 'test-api-key'
            }
        };

        td.when(
            ctx.fsMock.existsSync(td.matchers.contains('.gsloth.config.json'))
        ).thenReturn(true);

        td.when(
            ctx.fsMock.readFileSync(td.matchers.contains('.gsloth.config.json'), 'utf8')
        ).thenReturn(JSON.stringify(jsonConfig));

        const {initConfig, slothContext} = await import('../src/config.js');

        // Call the function
        await initConfig(jsonConfig);

        // Verify the config was set correctly with the mock instance
        expect(slothContext.config.llm).toBe(mockAnthropicInstance);

        // Verify no warnings or errors were displayed
        td.verify(ctx.consoleUtilsMock.displayWarning(td.matchers.anything()), {times: 0});
        td.verify(ctx.consoleUtilsMock.displayError(td.matchers.anything()), {times: 0});
    }

});
