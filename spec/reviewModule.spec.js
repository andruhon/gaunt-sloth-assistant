import { reviewInner } from '../src/modules/reviewModule.js';
import { slothContext } from '../src/config.js';
import { FakeListChatModel } from "@langchain/core/utils/testing";

describe('reviewModule', () => {

  it('should invoke LLM', async () => {
    // Setup mock for slothContext
    const testContext = {...slothContext, 
      config: {
        llm: new FakeListChatModel({
          responses: ["First LLM message", "Second LLM message"],
        })
      }
    };

    // Test the function
    const output = await reviewInner(testContext, () => {}, 'test-preamble', 'test-diff');
    expect(output).toBe("First LLM message");
  });

});