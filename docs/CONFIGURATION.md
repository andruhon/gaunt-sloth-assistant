# Configuration

Populate `.gsloth.preamble.review.md` with your project details and quality requirements.
Proper preamble is a paramount for good inference.
Check [.gsloth.preamble.review.md](../.gsloth.preamble.review.md) for example.

Your project should have the following files in order for gsloth to function:
- Configuration file (one of):
  - `.gsloth.config.js` (JavaScript module)
  - `.gsloth.config.json` (JSON file)
  - `.gsloth.config.mjs` (JavaScript module with explicit module extension)
- `.gsloth.preamble.review.md`

> Gaunt Sloth currently only functions from the directory which has one of the configuration files and `.gsloth.preamble.review.md`.
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
Make sure you either define `ANTHROPIC_API_KEY` environment variable or edit your configuration file and set up your key.

### Groq
```shell
cd ./your-project
gsloth init groq
```
Make sure you either define `GROQ_API_KEY` environment variable or edit your configuration file and set up your key.

## Examples of configuration for different providers 

### JSON Configuration (.gsloth.config.json)

JSON configuration is simpler but less flexible than JavaScript configuration. It should directly contain the configuration object.

**Example of .gsloth.config.json for Anthropic**
```json
{
  "llm": {
    "type": "anthropic",
    "apiKey": "your-api-key-here",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

**Example of .gsloth.config.json for VertexAI**
```json
{
  "llm": {
    "type": "vertexai",
    "model": "gemini-2.5-pro-preview-05-06",
    "temperature": 0
  }
}
```

**Example of .gsloth.config.json for Groq**
```json
{
  "llm": {
    "type": "groq",
    "model": "deepseek-r1-distill-llama-70b",
    "apiKey": "your-api-key-here"
  }
}
```

### JavaScript Configuration (.gsloth.config.js or .gsloth.config.mjs)

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
            model: "gemini-2.5-pro-preview-05-06", // Consider checking for latest recommended model versions
            // API Key from AI Studio should also work
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

## Using other AI providers

The configure function should simply return instance of langchain [chat model](https://v03.api.js.langchain.com/classes/_langchain_core.language_models_chat_models.BaseChatModel.html).
See [Langchain documentation](https://js.langchain.com/docs/tutorials/llm_chain/) for more details.

## Content providers

### JIRA

Example configuration setting up JIRA integration using a legacy API token for both `review` and `pr` commands.
Make sure you use your actual company domain in `baseUrl` and your personal legacy `token`.

A legacy token can be acquired from `Atlassian Account Settings -> Security -> Create and manage API tokens`.

JSON:

```json
{
  "llm": {"type": "vertexai", "model": "gemini-2.5-pro-preview-05-06"},
  "requirementsProvider": "jira-legacy",
  "requirementsProviderConfig": {
    "jira-legacy": {
      "username": "username@yourcompany.com",
      "token": "YOUR_JIRA_LEGACY_TOKEN",
      "baseUrl": "https://yourcompany.atlassian.net/rest/api/2/issue/"
    }
  }
}
```

JavaScript:

```javascript
export async function configure(importFunction, global) {
    const vertexAi = await importFunction('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro-preview-05-06"
        }),
        requirementsProvider: 'jira-legacy',
        requirementsProviderConfig: {
            'jira-legacy': {
                username: 'username@yourcompany.com', // Your Jira username/email
                token: 'YOUR_JIRA_LEGACY_TOKEN',     // Replace with your real Jira API token
                baseUrl: 'https://yourcompany.atlassian.net/rest/api/2/issue/'  // Your Jira instance base URL
            }
        }
    }
}
```
