import {Command} from 'commander';
import * as td from 'testdouble';

describe('reviewCommand',  function (){

    beforeEach(async function() {
        this.review = td.function();
        this.prompt = await td.replaceEsm("../src/prompt.js");
        td.when(this.prompt.readInternalPreamble()).thenReturn("INTERNAL PREAMBLE");
        td.when(this.prompt.readPreamble(".gsloth.preamble.review.md")).thenReturn("PROJECT PREAMBLE");
        this.codeReviewMock = await td.replaceEsm("../src/modules/reviewModule.js");
        await td.replaceEsm("../src/config.js");
        this.utils = await td.replaceEsm("../src/utils.js");
        td.when(this.utils.readFileFromCurrentDir("test.file")).thenReturn("FILE TO REVIEW");
        td.when(this.codeReviewMock.review(
            'sloth-DIFF-review',
            td.matchers.anything(),
            td.matchers.anything())
        ).thenDo(this.review);
    });

    it('Should pall review with file contents', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command()
        await reviewCommand(program, {});
        await program.parseAsync(['na', 'na', 'review', '-f', 'test.file']);
        td.verify(this.review('sloth-DIFF-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "FILE TO REVIEW"));
    });

    it('Should display predefined providers in help', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const testOutput = { text: '' };

        program.configureOutput({
            writeOut: (str) => testOutput.text += str,
            writeErr: (str) => testOutput.text += str
        });

        await reviewCommand(program, {});

        const commandUnderTest = program.commands.find(c => c.name() == 'review');
        expect(commandUnderTest).toBeDefined();
        commandUnderTest.outputHelp();

        // Verify content providers are displayed
        expect(testOutput.text).toContain('--content-provider <contentProvider>');
        expect(testOutput.text).toContain('(choices: "gh")');

        // Verify requirements providers are displayed
        expect(testOutput.text).toContain('--requirements-provider <requirementsProvider>');
        expect(testOutput.text).toContain('(choices: "jira-legacy")');
    });

    it('Should test predefined requirements provider', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const context = {
            config: {
                requirementsProvider: 'jira-legacy',
                requirementsProviderConfig: {
                    username: 'test-user',
                    token: 'test-token',
                    baseUrl: 'https://test-jira.atlassian.net/rest/api/2/issue/'
                }
            }
        };

        // Mock the jira provider
        const jiraProvider = td.func();
        td.when(jiraProvider(td.matchers.anything(), 'JIRA-123')).thenResolve('JIRA Requirements');

        // Replace the dynamic import with our mock
        td.when(td.replace(td.matchers.contains('../providers/jiraIssueLegacyAccessTokenProvider.js'))).thenReturn({
            get: jiraProvider
        });

        await reviewCommand(program, context);
        await program.parseAsync(['na', 'na', 'review', 'content-id', 'JIRA-123']);

        td.verify(this.review('sloth-DIFF-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "JIRA Requirements"));
    });

    it('Should test predefined content provider', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const context = {
            config: {
                contentProvider: 'gh',
                contentProviderConfig: {}
            }
        };

        // Mock the gh provider
        const ghProvider = td.func();
        td.when(ghProvider('123')).thenResolve('PR Diff Content');

        // Replace the dynamic import with our mock
        td.when(td.replace(td.matchers.contains('../providers/ghPrDiffProvider.js'))).thenReturn({
            get: ghProvider
        });

        await reviewCommand(program, context);
        await program.parseAsync(['na', 'na', 'review', '123']);

        td.verify(this.review('sloth-DIFF-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "PR Diff Content"));
    });

    it('Should test pr command', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const context = {};

        // Mock the gh provider
        const ghProvider = td.func();
        td.when(ghProvider('123')).thenResolve('PR Diff Content');

        // Replace the dynamic import with our mock
        td.when(td.replace(td.matchers.contains('../providers/ghPrDiffProvider.js'))).thenReturn({
            get: ghProvider
        });

        await reviewCommand(program, context);
        await program.parseAsync(['na', 'na', 'pr', '123']);

        td.verify(this.review('sloth-PR-123-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "PR Diff Content"));
    });
});
