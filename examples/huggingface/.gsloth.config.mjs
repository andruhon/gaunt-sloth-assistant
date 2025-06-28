export async function configure() {
  return {
    agentType: "huggingface",
    huggingfaceConfig: {
      model: "Qwen/Qwen2.5-72B-Instruct",
      apiKey: process.env.HUGGINGFACEHUB_API_KEY
    }
  };
}