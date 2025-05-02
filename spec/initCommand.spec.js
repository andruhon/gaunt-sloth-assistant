import {Command} from 'commander';
import * as td from 'testdouble';

describe('initCommand', function (){

    beforeEach(async function() {
        td.reset();
        // Create a mock for createProjectConfig
        this.createProjectConfig = td.function();

        // Replace the config module
        await td.replaceEsm("../src/config.js", {
            createProjectConfig: this.createProjectConfig,
            availableDefaultConfigs: ['vertexai', 'anthropic', 'groq'],
            SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
            USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
            slothContext: {
                installDir: '/mock/install/dir',
                currentDir: '/mock/current/dir',
                config: {},
                session: {}
            }
        });
    });

    it('Should call createProjectConfig with the provided config type', async function() {
        const { initCommand } = await import("../src/commands/initCommand.js");
        const program = new Command();
        await initCommand(program, {});
        await program.parseAsync(['na', 'na', 'init', 'vertexai']);
        td.verify(this.createProjectConfig('vertexai'));
    });

    it('Should display available config types in help', async function() {
        const { initCommand } = await import("../src/commands/initCommand.js");
        const program = new Command();
        const testOutput = { text: '' };

        program.configureOutput({
            writeOut: (str) => testOutput.text += str,
            writeErr: (str) => testOutput.text += str
        });

        await initCommand(program, {});

        const commandUnderTest = program.commands.find(c => c.name() === 'init');

        expect(commandUnderTest).toBeDefined();
        commandUnderTest.outputHelp();

        // Verify available config types are displayed
        expect(testOutput.text).toContain('<type>');
        expect(testOutput.text).toContain('(choices: "vertexai", "anthropic", "groq")');
    });
});
