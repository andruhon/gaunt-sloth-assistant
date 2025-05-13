import {beforeEach, describe, expect, it, vi} from 'vitest';
import {FakeListChatModel} from "@langchain/core/utils/testing";
import type {SlothContext} from '#src/config.js';

// Mock fs module for the second test
const fsMock = {
    writeFileSync: vi.fn()
};
vi.mock('node:fs', () => fsMock);

// Mock path module for the second test
const pathMock = {
    resolve: vi.fn()
};
vi.mock('node:path', () => pathMock);

// Mock systemUtils module for the second test
const systemUtilsMock = {
    getCurrentDir: vi.fn()
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

// Mock consoleUtils module for the second test
const consoleUtilsMock = {
    display: vi.fn(),
    displaySuccess: vi.fn(),
    displayError: vi.fn()
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

// Mock utils module for the second test
const utilsMock = {
    ProgressIndicator: vi.fn(),
    toFileSafeString: vi.fn(),
    fileSafeLocalDate: vi.fn(),
    createSystemMessage: vi.fn(),
    createHumanMessage: vi.fn()
};
vi.mock('#src/utils.js', () => utilsMock);

// Create a mock slothContext for the second test
const mockSlothContext = {
    config: {
        llm: new FakeListChatModel({
            responses: ["LLM Response"]
        })
    },
    session: {
        configurable: {
            thread_id: "test-thread-id"
        }
    }
} as SlothContext;

// Mock config module for the second test
vi.mock('#src/config.js', () => ({
    slothContext: mockSlothContext
}));

describe('questionAnsweringModule', () => {
    beforeEach(async () => {
        vi.resetAllMocks();

        const progressIndicator = {
            indicate: vi.fn()
        };
        utilsMock.ProgressIndicator.mockImplementation(() => progressIndicator)
    });

    it('should invoke LLM (internal)', async () => {
        // Import the module after setting up mocks
        const { askQuestionInner } = await import('#src/modules/questionAnsweringModule.js');

        // Test the function
        const output = await askQuestionInner(mockSlothContext, () => {}, 'test-preamble', 'test-content');

        expect(output).toBe("LLM Response");
    });

    it('should invoke LLM', async () => {
        // Reset the mock LLM for this test
        mockSlothContext.config.llm = new FakeListChatModel({
            responses: ["LLM Response"]
        });

        // Import the module after setting up mocks
        const { askQuestion } = await import('#src/modules/questionAnsweringModule.js');

        // Call askQuestion
        await askQuestion('test-source', 'test-preamble', 'test-content');

        // Verify that writeFileSync was called
        expect(fsMock.writeFileSync).toHaveBeenCalled();

        // Verify that display was called
        expect(consoleUtilsMock.display).toHaveBeenCalled();

        // Verify that displaySuccess was called
        expect(consoleUtilsMock.displaySuccess).toHaveBeenCalled();
    });
});
