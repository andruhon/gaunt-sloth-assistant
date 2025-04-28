import * as td from 'testdouble';

// FIXME these tests are flaky
describe('questionAnsweringModule', function (){

    beforeEach(async function() {
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

        // Replace modules with mocks
        await td.replaceEsm("node:fs", this.fs);

        this.path = {
            resolve: td.function()
        };
        await td.replaceEsm("node:path", this.path);

        // Create consoleUtils mock
        this.consoleUtils = {
            display: td.function(),
            displaySuccess: td.function(),
            displayError: td.function()
        };

        // Replace consoleUtils module
        await td.replaceEsm("../src/consoleUtils.js", this.consoleUtils);

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

        // Replace the utils module
        await td.replaceEsm("../src/utils.js", this.utils);

        // Mock slothContext and other config exports
        this.slothContext = await td.replaceEsm("../src/config.js", {
            slothContext: this.context,
            SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
            USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
            USER_PROJECT_CONFIG_FILE: '.gsloth.config.js',
            initConfig: td.function()
        });

        // Set up path.resolve mock
        this.path.resolve = td.function();
        td.when(this.path.resolve(td.matchers.anything(), td.matchers.contains('sloth-ASK'))).thenReturn('test-file-path.md');

        // Mock ProgressIndicator
        this.progressIndicator = {
            indicate: td.function()
        };
        td.when(new this.utils.ProgressIndicator(td.matchers.anything())).thenReturn(this.progressIndicator);
    });

    it('Should call LLM with correct messages', async function() {
        const { askQuestionInner } = await import("../src/modules/questionAnsweringModule.js");

        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        td.when(this.mockLlmInvoke(td.matchers.anything())).thenResolve(llmResponse);

        // Call the function
        const result = await askQuestionInner(this.context, () => {}, 'Test Preamble', 'Test Content');

        // Verify the result
        expect(result).toBe('LLM Response');
    });

    it('Should write output to file', async function() {
        const { askQuestion } = await import("../src/modules/questionAnsweringModule.js");

        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        td.when(this.mockLlmInvoke(td.matchers.anything())).thenResolve(llmResponse);

        // Call the function
        await askQuestion('sloth-ASK', 'Test Preamble', 'Test Content');

        // Verify the file was written
        td.verify(this.fs.writeFileSync('test-file-path.md', 'LLM Response'));

        // Verify success message was displayed
        td.verify(this.consoleUtils.displaySuccess(td.matchers.contains('test-file-path.md')));
    });

    it('Should handle file write errors', async function() {
        const { askQuestion } = await import("../src/modules/questionAnsweringModule.js");

        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        td.when(this.mockLlmInvoke(td.matchers.anything())).thenResolve(llmResponse);

        // Mock file write to throw an error
        const error = new Error('File write error');
        td.when(this.fs.writeFileSync('test-file-path.md', 'LLM Response')).thenThrow(error);

        // Call the function
        await askQuestion('sloth-ASK', 'Test Preamble', 'Test Content');

        // Verify error message was displayed
        td.verify(this.consoleUtils.displayError(td.matchers.contains('test-file-path.md')));
        td.verify(this.consoleUtils.displayError('File write error'));
    });
});
