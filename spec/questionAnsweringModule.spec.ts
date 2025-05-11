import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlothContext } from '#src/config.js';

// Define mocks at top level
const mockLlmInvoke = vi.fn();
const context = {
    config: {
        llm: {
            invoke: vi.fn()
        }
    },
    session: { configurable: { thread_id: 'test-thread-id' } }
} as SlothContext;

const fsMock = {
    writeFileSync: vi.fn()
};

const pathMock = {
    resolve: vi.fn(),
    dirname: vi.fn()
};

const consoleUtilsMock = {
    display: vi.fn(),
    displaySuccess: vi.fn(),
    displayError: vi.fn()
};

const utilsMock = {
    extractLastMessageContent: vi.fn(),
    toFileSafeString: vi.fn(),
    fileSafeLocalDate: vi.fn(),
    ProgressIndicator: vi.fn(),
    readFileSyncWithMessages: vi.fn(),
    spawnCommand: vi.fn()
};

const progressIndicator = {
    indicate: vi.fn()
};

// Set up static mocks
vi.mock('node:fs', () => fsMock);
vi.mock('node:path', () => pathMock);
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);
vi.mock('#src/utils.js', () => utilsMock);
vi.mock('#src/config.js', () => ({
    slothContext: context,
    SLOTH_INTERNAL_PREAMBLE: '.gsloth.preamble.internal.md',
    USER_PROJECT_REVIEW_PREAMBLE: '.gsloth.preamble.review.md',
    initConfig: vi.fn()
}));

describe('questionAnsweringModule', () => {
    beforeEach(async () => {
        vi.resetAllMocks();

        // Set up mock implementations
        utilsMock.extractLastMessageContent.mockReturnValue('LLM Response');
        utilsMock.toFileSafeString.mockReturnValue('sloth-ASK');
        utilsMock.fileSafeLocalDate.mockReturnValue('2025-01-01T00-00-00');
        pathMock.resolve.mockImplementation((path: string, name: string) => {
            if (name.includes('sloth-ASK')) return 'test-file-path.md';
            return '';
        });
        utilsMock.ProgressIndicator.mockImplementation(() => progressIndicator);
    });

    it('Should call LLM with correct messages', async () => {
        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        mockLlmInvoke.mockResolvedValue(llmResponse);
        context.config.llm.invoke = mockLlmInvoke;

        // Import the module after setting up mocks
        const { askQuestionInner } = await import("#src/modules/questionAnsweringModule.js");

        // Call the function
        const result = await askQuestionInner(context, () => {}, 'Test Preamble', 'Test Content');

        // Verify the result
        expect(result).toBe('LLM Response');
    });

    it('Should write output to file', async () => {
        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        mockLlmInvoke.mockResolvedValue(llmResponse);
        context.config.llm.invoke = mockLlmInvoke;

        // Import the module after setting up mocks
        const { askQuestion } = await import("#src/modules/questionAnsweringModule.js");

        // Call the function and wait for it to complete
        await askQuestion('sloth-ASK', 'Test Preamble', 'Test Content');

        // Verify the file was written with the correct content
        expect(fsMock.writeFileSync).toHaveBeenCalledWith('test-file-path.md', 'LLM Response');

        // Verify success message was displayed
        expect(consoleUtilsMock.displaySuccess).toHaveBeenCalledWith(expect.stringContaining('test-file-path.md'));
    });

    it('Should handle file write errors', async () => {
        // Mock the LLM response
        const llmResponse = [{ role: 'assistant', content: 'LLM Response' }];
        mockLlmInvoke.mockResolvedValue(llmResponse);
        context.config.llm.invoke = mockLlmInvoke;

        // Mock file write to throw an error
        const error = new Error('File write error');
        fsMock.writeFileSync.mockImplementation(() => {
            throw error;
        });

        // Import the module after setting up mocks
        const { askQuestion } = await import("#src/modules/questionAnsweringModule.js");

        // Call the function and wait for it to complete
        await askQuestion('sloth-ASK', 'Test Preamble', 'Test Content');

        // Verify error message was displayed
        expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(expect.stringContaining('test-file-path.md'));
        expect(consoleUtilsMock.displayError).toHaveBeenCalledWith('File write error');
    });
}); 