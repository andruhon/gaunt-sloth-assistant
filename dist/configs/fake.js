import { displayWarning } from "../consoleUtils.js";
// Function to process JSON config and create Fake LLM instance for testing
export async function processJsonConfig(llmConfig) {
    if (llmConfig.responses) {
        const test = await import('@langchain/core/utils/testing');
        return new test.FakeListChatModel({
            responses: llmConfig.responses
        });
    }
    displayWarning("Fake LLM requires 'responses' array in config");
    return null;
}
// No init function needed for fake LLM as it's only used for testing
//# sourceMappingURL=fake.js.map