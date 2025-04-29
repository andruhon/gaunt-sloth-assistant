import * as td from 'testdouble';

describe('questionAnsweringModule', function (){

    beforeEach(async function() {
        // Reset testdouble before each test
        td.reset();

        // Create a mock context
        this.mockLlmInvoke = td.function();
        this.context = {
            config: {
                llm: {
                    invoke: this.mockLlmInvoke
                }
            },
            session: {configurable: {thread_id: 'test-thread-id'}}
        };

        // Create fs mock
        this.fs = {
            writeFileSync: td.function()
        };

        // Create path mock
        this.path = {
            resolve: td.function()
        };

        // Create consoleUtils mock
        this.consoleUtils = {
            display: td.function(),
            displaySuccess: td.function(),
            displayError: td.function()
        };

        // Create utils mock functions
        const extractLastMessageContent = td.function();
        const toFileSafeString = td.function();
        const fileSafeLocalDate = td.function();
        const ProgressIndicator = td.constructor();
        const readFileSyncWithMessages = td.function();
        const spawnCommand = td.function();

        // Set up utils mock stubs
        td.when(extractLastMessageContent(td.matchers.anything())).thenReturn('LLM Response');
        td.when(toFileSafeString(td.matchers.anything())).thenReturn('sloth-ASK');
        td.when(fileSafeLocalDate()).thenReturn('2025-01-01T00-00-00');

        // Create the utils mock
        this.utils = {
            extractLastMessageContent,
            toFileSafeString,
            fileSafeLocalDate,
            ProgressIndicator,
            readFileSyncWithMessages,
            spawnCommand
        };

        // Set up path.resolve mock
        td.when(this.path.resolve(td.matchers.anything(), td.matchers.contains('sloth-ASK'))).thenReturn('test-file-path.md');

        // Mock ProgressIndicator
        this.progressIndicator = {
            indicate: td.function()
        };
        td.when(new this.utils.ProgressIndicator(td.matchers.anything())).thenReturn(this.progressIndicator);

        // Replace modules with mocks - do this after setting up all mocks
        await td.replaceEsm("node:fs", this.fs);
        await td.replaceEsm("node:path", this.path);
        await td.replaceEsm("../src/consoleUtils.js", this.consoleUtils);
        await td.replaceEsm("../src/utils.js", this.utils);

        // Mock slothContext and other config exports
        await td.replaceEsm("../src/config.js", {
            slothContext: this.context,
            SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
            USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
            USER_PROJECT_CONFIG_FILE: '.gsloth.config.js',
            initConfig: td.function()
        });
    });

    it('Should call LLM with correct messages', async function() {
        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        td.when(this.mockLlmInvoke(td.matchers.anything())).thenResolve(llmResponse);

        // Import the module after setting up mocks
        const { askQuestionInner } = await import("../src/modules/questionAnsweringModule.js");

        // Call the function
        const result = await askQuestionInner(this.context, () => {}, 'Test Preamble', 'Test Content');

        // Verify the result
        expect(result).toBe('LLM Response');
    });

    it('Should write output to file', async function() {
        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        td.when(this.mockLlmInvoke(td.matchers.anything())).thenResolve(llmResponse);

        // Import the module after setting up mocks
        const { askQuestion } = await import("../src/modules/questionAnsweringModule.js");

        // Call the function and wait for it to complete
        await askQuestion('sloth-ASK', 'Test Preamble', 'Test Content');

        // Verify the file was written with the correct content
        td.verify(this.fs.writeFileSync('test-file-path.md', 'LLM Response'));

        // Verify success message was displayed
        td.verify(this.consoleUtils.displaySuccess(td.matchers.contains('test-file-path.md')));
    });

    it('Should handle file write errors', async function() {
        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        td.when(this.mockLlmInvoke(td.matchers.anything())).thenResolve(llmResponse);

        // Mock file write to throw an error
        const error = new Error('File write error');
        td.when(this.fs.writeFileSync('test-file-path.md', 'LLM Response')).thenThrow(error);

        // Import the module after setting up mocks
        const { askQuestion } = await import("../src/modules/questionAnsweringModule.js");

        // Call the function and wait for it to complete
        await askQuestion('sloth-ASK', 'Test Preamble', 'Test Content');

        // Verify error message was displayed
        td.verify(this.consoleUtils.displayError(td.matchers.contains('test-file-path.md')));
        td.verify(this.consoleUtils.displayError('File write error'));
    });
});
