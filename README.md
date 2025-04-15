# Gaunt Sloth Assistant
Simplistic assistant helping to do code reviews from command line based on [Langchain.js](https://github.com/langchain-ai/langchainjs)

## Review PR
`gsloth pr 42`

## Review Diff
`git --no-pager diff origin/master...ffd079c134eabf18d85975f155b76d62a895cdec | gsloth review`
(May be helpful to review subset of PR)

## Question Answering
`gsloth ask "which types of primitives are available in JavaScript?"`

`gsloth ask "Please have a look at this file" -f index.js`

## Installation
There's no npm module yet. Do `npm install -g ./` to install local build globally to your machine.
```
git clone https://github.com/andruhon/gaunt-sloth.git
npm install
npm install -g ./
```

## Configuration
There is no global configuration yet. The project you want to get reviewed needs gsloth configuration.

Add `.gsloth.preamble.review.md` to your project.
Add general description of what your project is and what do you expect from this code review.
Check [.gsloth.preamble.review.md](.gsloth.preamble.review.md) for example.

Add `.gsloth.config.js,` to your project.

**Example of .gsloth.config.js for Anthropic**  
```javascript
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    // At a moment only google-vertexai and anthropic packaged with Sloth, but you can install support for any other langchain llms
    const anthropic = await importFunction('@langchain/anthropic');
    return {
        llm: new anthropic.ChatAnthropic({
            apiKey:                                                                                                                                                         "sk-ant-api03--YOURAPIHASH", // You should put your API hash here
            model: "claude-3-5-sonnet-20241022"
        })
    };
}

```

**Example of .gsloth.config.js for VertexAI**  
VertexAI usually needs `gcloud auth application-default login` and does not need any separate API keys.
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

