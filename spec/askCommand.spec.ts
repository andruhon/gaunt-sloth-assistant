import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlothContext } from '#src/config.js';

// Use vi.hoisted() to ensure ctx is available during mock setup
const ctx = vi.hoisted(() => ({
    askQuestion: vi.fn(),
    prompt: {
        readInternalPreamble: vi.fn().mockReturnValue("INTERNAL PREAMBLE")
    },
    questionAnsweringMock: {
        askQuestion: vi.fn()
    },
    utilsMock: {
        readFileFromCurrentDir: vi.fn(),
        readMultipleFilesFromCurrentDir: vi.fn(),
        ProgressIndicator: vi.fn(),
        extractLastMessageContent: vi.fn(),
        toFileSafeString: vi.fn(),
        fileSafeLocalDate: vi.fn()
    }
}));

// Mock modules before any tests
vi.doMock("#src/prompt.js", () => ({
    readInternalPreamble: ctx.prompt.readInternalPreamble
}));

vi.doMock("#src/modules/questionAnsweringModule.js", () => ({
    askQuestion: ctx.questionAnsweringMock.askQuestion
}));

vi.doMock("#src/config.js", () => ({
    SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
    USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
    slothContext: {
        config: {},
        currentDir: '/mock/current/dir',
        installDir: '/mock/install/dir'
    },
    initConfig: vi.fn()
}));

vi.doMock("#src/utils.js", () => ({
    readFileFromCurrentDir: ctx.utilsMock.readFileFromCurrentDir,
    readMultipleFilesFromCurrentDir: ctx.utilsMock.readMultipleFilesFromCurrentDir,
    ProgressIndicator: ctx.utilsMock.ProgressIndicator,
    extractLastMessageContent: ctx.utilsMock.extractLastMessageContent,
    toFileSafeString: ctx.utilsMock.toFileSafeString,
    fileSafeLocalDate: ctx.utilsMock.fileSafeLocalDate
}));

describe('askCommand', () => {
    beforeEach(async () => {
        vi.resetAllMocks();

        // Set up mocks
        ctx.questionAnsweringMock.askQuestion.mockImplementation((...args) => ctx.askQuestion(...args));
        ctx.utilsMock.readFileFromCurrentDir.mockImplementation((path: string) => {
            if (path === "test.file") return "FILE CONTENT";
            return '';
        });
        ctx.utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
            if (files.includes("test.file")) return "test.file:\n```\nFILE CONTENT\n```";
            return '';
        });
    });

    it('Should call askQuestion with message', async () => {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        await askCommand(program, {} as SlothContext);
        await program.parseAsync(['na', 'na', 'ask', 'test message']);
        expect(ctx.askQuestion).toHaveBeenCalledWith('sloth-ASK', "INTERNAL PREAMBLE", "test message");
    });

    it('Should call askQuestion with message and file content', async () => {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        await askCommand(program, {} as SlothContext);
        await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file']);
        expect(ctx.askQuestion).toHaveBeenCalledWith('sloth-ASK', "INTERNAL PREAMBLE", "test message\ntest.file:\n```\nFILE CONTENT\n```");
    });

    it('Should call askQuestion with message and multiple file contents', async () => {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        await askCommand(program, {} as SlothContext);
        ctx.utilsMock.readMultipleFilesFromCurrentDir.mockImplementation((files: string[]) => {
            if (files.includes("test.file") && files.includes("test2.file")) {
                return "test.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```";
            }
            return '';
        });
        await program.parseAsync(['na', 'na', 'ask', 'test message', '-f', 'test.file', 'test2.file']);
        expect(ctx.askQuestion).toHaveBeenCalledWith('sloth-ASK', "INTERNAL PREAMBLE", "test message\ntest.file:\n```\nFILE CONTENT\n```\n\ntest2.file:\n```\nFILE2 CONTENT\n```");
    });

    it('Should display help correctly', async () => {
        const { askCommand } = await import("../src/commands/askCommand.js");
        const program = new Command();
        const testOutput = { text: '' };

        program.configureOutput({
            writeOut: (str: string) => testOutput.text += str,
            writeErr: (str: string) => testOutput.text += str
        });

        await askCommand(program, {} as SlothContext);

        const commandUnderTest = program.commands.find(c => c.name() === 'ask');
        expect(commandUnderTest).toBeDefined();
        commandUnderTest?.outputHelp();

        // Verify help content
        expect(testOutput.text).toContain('Ask a question');
        expect(testOutput.text).toContain('<message>');
        expect(testOutput.text).toContain('-f, --file');
    });
}); 
