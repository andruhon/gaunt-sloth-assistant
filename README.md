# Gaunt Sloth Assistant
Simplistic AI assistant helping to do **code reviews from command line** based on [Langchain.js](https://github.com/langchain-ai/langchainjs)

## Review PR (Pull Request)
To review PR by PR number:

First make sure the official [GitHub cli (gh)](https://cli.github.com/) is installed
and authenticated to have access to your project.

Open terminal (command line) in your project directory.

Type command: `gsloth pr [desired pull request number]`, for example:

```shell
gsloth pr 42
``` 

Review providing markdown file with requirements and notes.
```shell
gsloth pr 42 -f PROJ-1234.md
```
Jira integration is in [ROADMAP](ROADMAP.md).
Currently, the easiest ***meaningful*** way to add jira description is to
open Jira XML with "Export XML" in jira and to copy `<description></description>` block.
This block contains HTML and AI understands it easily 
(most importantly it understand nested lists like ul>li).

## JIRA Integration

When JIRA integration is configured, the JIRA issue text can be included alongside the diff for review.
The project review preamble can be modified to reject a pull request immediately
if it appears to implement something different from what was requested in the requirements.

The command syntax is generally `gsloth pr <prId> [requirementsId]`,
for example, the snippet below does review of PR 42 and
supplies description of JIRA issue with number PP-4242:

```shell
gsloth pr 42 PP-4242
```

Example configuration setting up JIRA integration using a legacy API token.
Make sure you use your actual company domain in `baseUrl` and your personal legacy `token`.

A legacy token can be acquired from `Atlassian Account Settings -> Security -> Create and manage API tokens`.

```javascript
export async function configure(importFunction, global) {
    const vertexAi = await importFunction('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro-exp-03-25"
        }),
        requirementsProvider: 'jira-legacy',
        requirementsProviderConfig: {
            username: 'andrei.kondratev@unimarket.com', // Your Jira username/email
            token: 'YOURSECRETTOKEN',     // Replace with your real Jira API token
            baseUrl: 'https://yourcompany.atlassian.net/rest/api/2/issue/'  // Your Jira instance base URL
        }
    }
}
```

## Review any Diff
```shell
git --no-pager diff origin/master...yourgitcommithash | gsloth review
```
(helpful to review a subset of PR)

Review current local changes:
```shell
git --no-pager diff | gsloth review
```

## Question Answering
```shell
gsloth ask "which types of primitives are available in JavaScript?"
```

```shell
gsloth ask "Please have a look at this file" -f index.js
```

## Installation

Tested with Node 22 LTS.

## NPM
```shell
npm install gaunt-sloth-assistant -g
```

## Configuration
Go to your project directory and init sloth with vendor of your choice.

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

### Further configuration

Currently vertexai, anthropic and groq can be configured with `gsloth init`.

Populate `.gsloth.preamble.review.md` with your project details and quality requirements.
Proper preamble is a paramount for good inference.
Check [.gsloth.preamble.review.md](.gsloth.preamble.review.md) for example.

### Manual configuration.
Your project should have the following files in order for gsloth to function:
- `.gsloth.config.js`
- `.gsloth.preamble.review.md`

Global configuration to invoke gsloth anywhere is in [ROADMAP](ROADMAP.md).

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

The configure function should simply return instance of langchain [chat model](https://v03.api.js.langchain.com/classes/_langchain_core.language_models_chat_models.BaseChatModel.html).
See [Langchain documentation](https://js.langchain.com/docs/tutorials/llm_chain/) for more details.

## License
License is [MIT](https://opensource.org/license/mit). See [LICENSE](LICENSE)

