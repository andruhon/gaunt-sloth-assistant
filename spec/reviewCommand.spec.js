import {Command} from 'commander';
import * as td from 'testdouble';

describe('reviewCommand',  function (){

    beforeEach(async function() {
        td.reset();
        this.review = td.function();
        this.prompt = await td.replaceEsm("../src/prompt.js");
        td.when(this.prompt.readInternalPreamble()).thenReturn("INTERNAL PREAMBLE");
        td.when(this.prompt.readPreamble(".gsloth.preamble.review.md")).thenReturn("PROJECT PREAMBLE");
        this.codeReviewMock = await td.replaceEsm("../src/modules/reviewModule.js");
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
        td.when(this.utilsMock.readFileFromCurrentDir("test.file")).thenReturn("FILE TO REVIEW");
        td.when(this.codeReviewMock.review(
            'sloth-DIFF-review',
            td.matchers.anything(),
            td.matchers.anything())
        ).thenDo(this.review);
    });

    it('Should call review with file contents', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command()
        await reviewCommand(program, {});
        await program.parseAsync(['na', 'na', 'review', '-f', 'test.file']);
        td.verify(this.review(
            'sloth-DIFF-review',
            "INTERNAL PREAMBLE\nPROJECT PREAMBLE",
            "test.file:\n```\nFILE TO REVIEW\n```")
        );
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

        const commandUnderTest = program.commands.find(c => c.name() === 'review');
        expect(commandUnderTest).toBeDefined();
        commandUnderTest.outputHelp();

        // Verify content providers are displayed
        expect(testOutput.text).toContain('--content-provider <contentProvider>');
        expect(testOutput.text).toContain('(choices: "gh", "text")');

        // Verify requirements providers are displayed
        expect(testOutput.text).toContain('--requirements-provider <requirementsProvider>');
        expect(testOutput.text).toContain('(choices: "jira-legacy", "text")');
    });

    it('Should call review with predefined requirements provider', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const context = {
            config: {
                requirementsProvider: 'jira-legacy',
                requirementsProviderConfig: {
                    'jira-legacy': {
                        username: 'test-user',
                        token: 'test-token',
                        baseUrl: 'https://test-jira.atlassian.net/rest/api/2/issue/'
                    }
                }
            }
        };

        // Mock the jira provider
        const jiraProvider = td.func();
        td.when(jiraProvider(td.matchers.anything(), 'JIRA-123')).thenResolve('JIRA Requirements');

        // Replace the dynamic import with our mock
        await td.replaceEsm('../src/providers/jiraIssueLegacyAccessTokenProvider.js', {
            get: jiraProvider
        });

        await reviewCommand(program, context);
        await program.parseAsync(['na', 'na', 'review', 'content-id', '-r', 'JIRA-123']);

        td.verify(this.review('sloth-DIFF-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "JIRA Requirements"));
    });

    it('Should call review with predefined content provider', async function() {
        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const context = {
            config: {
                contentProvider: 'gh'
            }
        };

        // Mock the gh provider
        const ghProvider = td.func();
        td.when(ghProvider(td.matchers.anything(), '123')).thenResolve('PR Diff Content');

        // Replace the dynamic import with our mock
        await td.replaceEsm('../src/providers/ghPrDiffProvider.js', {
            get: ghProvider
        });

        await reviewCommand(program, context);
        await program.parseAsync(['na', 'na', 'review', '123']);

        td.verify(this.review('sloth-DIFF-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "PR Diff Content"));
    });

    it('Should call pr command', async function() {
        // Create a spy for the review function
        const reviewSpy = td.func();

        // Replace the review function in the codeReviewMock
        this.codeReviewMock.review = reviewSpy;

        // Mock the modules/reviewModule.js import in the reviewCommand.js file
        await td.replaceEsm('../src/modules/reviewModule.js', {
            review: reviewSpy
        });

        const { reviewCommand } = await import("../src/commands/reviewCommand.js");
        const program = new Command();
        const context = {};

        // Mock the gh provider
        const ghProvider = td.func();
        td.when(ghProvider(td.matchers.anything(), '123')).thenResolve('PR Diff Content');

        // Replace the dynamic import with our mock
        await td.replaceEsm('../src/providers/ghPrDiffProvider.js', {
            get: ghProvider
        });

        await reviewCommand(program, context);
        await program.parseAsync(['na', 'na', 'pr', '123']);

        td.verify(reviewSpy('sloth-PR-123-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "PR Diff Content"));
    });
});
