import {Command} from 'commander';
import * as td from 'testdouble';

describe('askCommand', function (){

    beforeEach(async function() {
        td.reset();
        this.askQuestion = td.function();
        this.prompt = await td.replaceEsm("../src/prompt.js");
        td.when(this.prompt.readInternalPreamble()).thenReturn("INTERNAL PREAMBLE");
        this.questionAnsweringMock = await td.replaceEsm("../src/modules/questionAnsweringModule.js");
        await td.replaceEsm("../src/config.js", {
            SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
            USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
            slothContext: {
                config: {},
                currentDir: '/mock/current/dir'
            },
            initConfig: td.function()
        });
        const readFileFromCurrentDir = td.function();
        const extractLastMessageContent = td.function();
        const toFileSafeString = td.function();
        const fileSafeLocalDate = td.function();
        this.utilsMock = {
            readFileFromCurrentDir,
            ProgressIndicator: td.constructor(),
            extractLastMessageContent,
            toFileSafeString,
            fileSafeLocalDate
        };
        await td.replaceEsm("../src/utils.js", this.utilsMock);
        td.when(this.utilsMock.readFileFromCurrentDir("test.file")).thenReturn("FILE CONTENT");
        td.when(this.questionAnsweringMock.askQuestion(
            'sloth-ASK',
            td.matchers.anything(),
            td.matchers.anything())
        ).thenDo(this.askQuestion);
    });

    it('Should call askQuestion with message', async function() {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        await askCommand(program, {});
        await program.parseAsync(['na', 'na', 'ask', 'test message']);
        td.verify(this.askQuestion('sloth-ASK', "INTERNAL PREAMBLE", "test message"));
    });

    it('Should call askQuestion with message and file content', async function() {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        await askCommand(program, {});
        await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file']);
        td.verify(this.askQuestion('sloth-ASK', "INTERNAL PREAMBLE", "test message\nFILE CONTENT"));
    });

    it('Should display help correctly', async function() {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        const testOutput = { text: '' };

        program.configureOutput({
            writeOut: (str) => testOutput.text += str,
            writeErr: (str) => testOutput.text += str
        });

        await askCommand(program, {});

        const commandUnderTest = program.commands.find(c => c.name() == 'ask');
        expect(commandUnderTest).toBeDefined();
        commandUnderTest.outputHelp();

        // Verify help content
        expect(testOutput.text).toContain('Ask a question');
        expect(testOutput.text).toContain('<message>');
        expect(testOutput.text).toContain('-f, --file');
    });
});
