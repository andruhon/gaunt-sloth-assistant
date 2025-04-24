export async function configure(importFunction, global) {
    const test = await importFunction('@langchain/core/utils/testing');
    return {
        llm: new test.FakeListChatModel({
            responses: ["First LLM message", "Second LLM message"],
        })
    }
}
