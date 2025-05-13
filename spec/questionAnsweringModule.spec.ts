import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeListChatModel } from "@langchain/core/utils/testing";
import type { SlothContext } from '#src/config.js';

describe('questionAnsweringModule', () => {
    beforeEach(async () => {
        vi.resetAllMocks();
    });

    it('should invoke LLM', async () => {
        // Setup mock for slothContext
        const testContext = {
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

        // Import the module after setting up mocks
        const { askQuestionInner } = await import('#src/modules/questionAnsweringModule.js');

        // Test the function
        const output = await askQuestionInner(testContext, () => {}, 'test-preamble', 'test-content');

        expect(output).toBe("LLM Response");
    });
});
