# Configuration

Populate `.gsloth.preamble.review.md` with your project details and quality requirements.
Proper preamble is a paramount for good inference.
Check [.gsloth.preamble.review.md](../.gsloth.preamble.review.md) for example.

Your project should have the following files in order for gsloth to function:
- `.gsloth.config.js`
- `.gsloth.preamble.review.md`

> Gaunt Sloth currently only functions from the directory which has `.gsloth.config.js` and `.gsloth.preamble.review.md`.
> Global configuration to invoke gsloth anywhere is in [ROADMAP](../ROADMAP.md).

## Config initialization
Configuration can be created with `gsloth init [vendor]` command.
Currently, vertexai, anthropic and groq can be configured with `gsloth init [vendor]`.

### Google Vertex AI
```shell
cd ./your-project
gsloth init vertexai
gcloud auth login
gcloud auth application-default login
```

### Anthropic
```shell
cd ./your-project
gsloth init anthropic
```
Make sure you either define `ANTHROPIC_API_KEY` environment variable or edit `.gsloth.config.js` and set up your key.

### Groq
```shell
cd ./your-project
gsloth init groq
```
Make sure you either define `GROQ_API_KEY` environment variable or edit `.gsloth.config.js` and set up your key.

## Examples of configuration for different providers 

**Example of .gsloth.config.js for Anthropic**
```javascript
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    // At a moment only google-vertexai and anthropic packaged with Sloth, but you can install support for any other langchain llms
    const anthropic = await importFunction('@langchain/anthropic');
    return {
        llm: new anthropic.ChatAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
            model: "claude-3-5-sonnet-20241022"
        })
    };
}
```

**Example of .gsloth.config.js for VertexAI**  
VertexAI usually needs `gcloud auth application-default login`
(or both `gcloud auth login` and `gcloud auth application-default login`) and does not need any separate API keys.
```javascript
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    // At a moment only google-vertexai and anthropic packaged with Sloth, but you can install support for any other langchain llms
    // Note: for vertex AI you likely to need to do `gcloud auth login`
    const vertexAi = await importFunction('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro-exp-03-25", // Consider checking for latest recommended model versions
            temperature: 0,
            //// Other parameters might be relevant depending on Vertex AI API updates.
            //// The project is not in the interface, but it is in documentation and it seems to work.
            // project: 'your-cool-google-cloud-project',
        })
    }
}
```

**Example of .gsloth.config.js for Groq**  
VertexAI usually needs `gcloud auth application-default login`
(or both `gcloud auth login` and `gcloud auth application-default login`) and does not need any separate API keys.
```javascript
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    const groq = await importFunction('@langchain/groq');
    return {
        llm: new groq.ChatGroq({
            model: "deepseek-r1-distill-llama-70b", // Check other models available
            apiKey: process.env.GROQ_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
        })
    };
}
```

## Using other providers

The configure function should simply return instance of langchain [chat model](https://v03.api.js.langchain.com/classes/_langchain_core.language_models_chat_models.BaseChatModel.html).
See [Langchain documentation](https://js.langchain.com/docs/tutorials/llm_chain/) for more details.