# Configuration

Populate `.gsloth.guidelines.md` with your project details and quality requirements.
A proper preamble is paramount for good inference.
Check [.gsloth.guidelines.md](../.gsloth.guidelines.md) for example.

Your project should have the following files in order for gsloth to function:
- Configuration file (one of):
  - `.gsloth.config.js` (JavaScript module)
  - `.gsloth.config.json` (JSON file)
  - `.gsloth.config.mjs` (JavaScript module with explicit module extension)
- `.gsloth.guidelines.md`

> Gaunt Sloth currently only functions from the directory which has one of the configuration files and `.gsloth.guidelines.md`. Configuration files can be located in the project root or in the `.gsloth/.gsloth-settings/` directory.
>
> You can also specify a path to a configuration file directly using the `-c` or `--config` global flag, for example `gth -c /path/to/your/config.json ask "who are you?"`

## Using .gsloth Directory

For a tidier project structure, you can create a `.gsloth` directory in your project root. When this directory exists, gsloth will:

1. Write all output files (like responses from commands) to the `.gsloth` directory instead of the project root
2. Look for configuration files in `.gsloth/.gsloth-settings/` subdirectory

Example directory structure when using the `.gsloth` directory:

```
.gsloth/.gsloth-settings/.gsloth-config.json
.gsloth/.gsloth-settings/.gsloth.guidelines.md
.gsloth/.gsloth-settings/.gsloth.review.md
.gsloth/gth_2025-05-18_09-34-38_ASK.md
.gsloth/gth_2025-05-18_22-09-00_PR-22.md
```

If the `.gsloth` directory doesn't exist, gsloth will continue writing all files to the project root directory as it did previously.

**Note:** When initializing a project with an existing `.gsloth` directory, the configuration files will be created in the `.gsloth/.gsloth-settings` directory automatically. There is no automated migration for existing configurations - if you create a `.gsloth` directory after initialization, you'll need to manually move your configuration files into the `.gsloth/.gsloth-settings` directory.

## Configuration Object

It is always worth checking sourcecode in [config.ts](../src/config.ts) for more insightful information.

| Parameter                                | Required                          | Default Value | Description                                                                                                                                                                                                                                               |
|------------------------------------------|-----------------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `llm`                                    | Required                          | -             | An object configuring LLM. In JS config could be actual instance of LangChainJS [BaseChatModel](https://v03.api.js.langchain.com/classes/_langchain_core.language_models_chat_models.BaseChatModel.html), allowing to use LLMs which do not have a preset. |
| `llm.type`                               | Required (when using JSON config) | -             | LLM type or provider. Options currently available are `anthropic`, `groq`, `deepseek`, `openai`, `google-genai`, `vertexai` and `xai`. For providers using OpenAI format (like Inception), use `openai` type with custom configuration. To use other models supported by LangChainJS, please use JavaScript config.                                                                                     |
| `llm.model`                              | Optional                          | -             | Particular LLM model string (Check in your provider documentation).                                                                                                                                                                                       |
| `llm.apiKey`                             | Optional                          | -             | API key for the LLM provider. You can either use this parameter or use environment variable.                                                                                                                                                              |
| `contentProvider`                        | Optional                          | `file`        | Default content provider used to get content for review. Options available are `github`, `file` and `text` (`text` provides text as it is).                                                                                                               |
| `requirementsProvider`                   | Optional                          | `file`        | Default requirements provider used to get requirements for review. Options available are `jira`, `jira-legacy`, `github`, `file` and `text`.                                                                                                              |
| `projectGuidelines`                      | Optional                          | `.gsloth.guidelines.md` | Path to the file containing project guidelines.                                                                                                                                                                                                           |
| `projectReviewInstructions`              | Optional                          | `.gsloth.review.md` | Path to the file containing project review instructions.                                                                                                                                                                                                  |
| `streamOutput`                           | Optional                          | `true`        | When set to `true`, AI responses are streamed to the console in real-time. When `false`, responses are displayed only after completion.                                                                                                                   |
| `filesystem`                             | Optional                          | See note      | File system access configuration. Options: `'all'`, `'none'`, or an array of specific file operation names. Default is an array of read-only operations: `['read_file', 'read_multiple_files', 'list_directory', 'directory_tree', 'search_files', 'get_file_info', 'list_allowed_directories']`. |
| `commands`                               | Optional                          | -             | Configuration for specific commands.                                                                                                                                                                                                                      |
| `commands.pr`                            | Optional                          | -             | Configuration for the PR command.                                                                                                                                                                                                                         |
| `commands.pr.contentProvider`            | Optional                          | `github`      | Content provider used for PR review (`gsloth pr`).                                                                                                                                                                                                        |
| `commands.pr.requirementsProvider`       | Optional                          | `github`      | Requirements provider used for PR review. If not specified, falls back to the global `requirementsProvider`.                                                                                                                                              |
| `commands.pr.filesystem`                 | Optional                          | -             | File system access configuration for PR command. Options: `'all'`, `'none'`, or specific file patterns for read-only access.                                                                                                                              |
| `commands.review`                        | Optional                          | -             | Configuration for the review command.                                                                                                                                                                                                                     |
| `commands.review.contentProvider`        | Optional                          | -             | Content provider specifically for the review command. If not specified, falls back to the global `contentProvider`.                                                                                                                                       |
| `commands.review.requirementsProvider`   | Optional                          | -             | Requirements provider specifically for the review command. If not specified, falls back to the global `requirementsProvider`.                                                                                                                             |
| `commands.review.filesystem`             | Optional                          | -             | File system access configuration for review command. Options: `'all'`, `'none'`, or specific file patterns for read-only access.                                                                                                                           |
| `commands.ask`                           | Optional                          | -             | Configuration for the ask command.                                                                                                                                                                                                                        |
| `commands.ask.filesystem`                | Optional                          | -             | File system access configuration for ask command. Options: `'all'`, `'none'`, or specific file patterns for read-only access.                                                                                                                              |
| `commands.chat`                          | Optional                          | -             | Configuration for the chat command (interactive chat sessions).                                                                                                                                                                                           |
| `commands.chat.filesystem`               | Optional                          | -             | File system access configuration for chat command. Options: `'all'`, `'none'`, or specific file patterns for read-only access.                                                                                                                             |
| `commands.code`                          | Optional                          | -             | Configuration for the code command (interactive coding sessions with file system access).                                                                                                                                                                 |
| `commands.code.filesystem`               | Optional                          | `all`         | File system access configuration for code command. Options: `'all'`, `'none'`, or specific file patterns. Default is `'all'` for full file system access.                                                                                                 |
| `requirementsProviderConfig`             | Optional                          | -             | Configuration for requirements providers. Contains provider-specific configurations.                                                                                                                                                                      |
| `requirementsProviderConfig.jira`        | Optional                          | -             | Configuration for the Jira requirements provider (Atlassian REST API v3 with Personal Access Token).                                                                                                                                                      |
| `requirementsProviderConfig.jira.username` | Optional                          | -             | Jira username (email). Can also be set via JIRA_USERNAME environment variable.                                                                                                                                                                            |
| `requirementsProviderConfig.jira.token`  | Optional                          | -             | Jira Personal Access Token. Can also be set via JIRA_API_PAT_TOKEN environment variable.                                                                                                                                                                  |
| `requirementsProviderConfig.jira.cloudId` | Required for `jira`                | -             | Atlassian Cloud ID. Can also be set via JIRA_CLOUD_ID environment variable.                                                                                                                                                                               |
| `requirementsProviderConfig.jira.displayUrl` | Optional                          | -             | Optional URL for displaying Jira issues (e.g., "https://yourcompany.atlassian.net/browse/").                                                                                                                                                              |
| `requirementsProviderConfig.jira-legacy` | Optional                          | -             | Configuration for the Jira Legacy requirements provider (Atlassian REST API v2 with Legacy API Token).                                                                                                                                                    |
| `requirementsProviderConfig.jira-legacy.username` | Optional                          | -             | Jira username (email). Can also be set via JIRA_USERNAME environment variable.                                                                                                                                                                            |
| `requirementsProviderConfig.jira-legacy.token` | Optional                          | -             | Jira Legacy API Token. Can also be set via JIRA_LEGACY_API_TOKEN environment variable.                                                                                                                                                                    |
| `requirementsProviderConfig.jira-legacy.baseUrl` | Required for `jira-legacy`          | -             | Base URL for the Jira API (e.g., "https://yourcompany.atlassian.net/rest/api/2/issue/").                                                                                                                                                                  |
| `requirementsProviderConfig.jira-legacy.displayUrl` | Optional                          | -             | Optional URL for displaying Jira issues (e.g., "https://yourcompany.atlassian.net/browse/").                                                                                                                                                              |
| `contentProviderConfig`                  | Optional                          | -             | Configuration for content providers. Currently, the available content providers (`github`, `file`, and `text`) don't require specific configuration.                                                                                                      |
| `tools`                                  | Optional (JS config only)         | -             | Array of LangChain tools that can be used by the LLM. This option is only available when using JavaScript configuration, allowing you to extend functionality with custom tools.                                                                          |
| `mcpServers`                              | Optional                          | -             | Configuration for Model Context Protocol (MCP) servers. This allows for enhanced context management.                                                                                                                               |

## Config initialization
Configuration can be created with `gsloth init [vendor]` command.
Currently, anthropic, groq, deepseek, openai, google-genai, vertexai and xai can be configured with `gsloth init [vendor]`.
For providers using OpenAI format (like Inception), use `gsloth init openai` and then modify the configuration.

### Google GenAI (AI Studio)
```shell
cd ./your-project
gsloth init google-genai
```

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

### DeepSeek
```shell
cd ./your-project
gsloth init deepseek
```
Make sure you either define `DEEPSEEK_API_KEY` environment variable or edit your configuration file and set up your key.
(note this meant to be an API key from deepseek.com, rather than from a distributor like TogetherAI)

### OpenAI
```shell
cd ./your-project
gsloth init openai
```
Make sure you either define `OPENAI_API_KEY` environment variable or edit your configuration file and set up your key.

### Open Router

```shell
cd ./your-project
gsloth init openrouter
```

Make sure you either define `OPEN_ROUTER_API_KEY` environment variable or edit your configuration file and set up your key.

### Other OpenAI-compatible providers (Inception, etc.)
For providers that use OpenAI-compatible APIs:
```shell
cd ./your-project
gsloth init openai
```

Then edit your configuration file to add the custom base URL and API key. For example, for Inception:
```json
{
  "llm": {
    "type": "openai",
    "model": "mercury-coder",
    "apiKeyEnvironmentVariable": "INCEPTION_API_KEY",
    "configuration": {
      "baseURL": "https://api.inceptionlabs.ai/v1"
    }
  }
}
```
* apiKeyEnvironmentVariable property can be used to point to the correct API key environment variable.

### xAI
```shell
cd ./your-project
gsloth init xai
```
Make sure you either define `XAI_API_KEY` environment variable or edit your configuration file and set up your key.

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
You can use the `ANTHROPIC_API_KEY` environment variable instead of specifying `apiKey` in the config.

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
You can use the `GROQ_API_KEY` environment variable instead of specifying `apiKey` in the config.

**Example of .gsloth.config.json for DeepSeek**
```json
{
  "llm": {
    "type": "deepseek",
    "model": "deepseek-reasoner",
    "apiKey": "your-api-key-here"
  }
}
```
You can use the `DEEPSEEK_API_KEY` environment variable instead of specifying `apiKey` in the config.

**Example of .gsloth.config.json for OpenAI**
```json
{
  "llm": {
    "type": "openai",
    "model": "gpt-4o",
    "apiKey": "your-api-key-here"
  }
}
```
You can use the `OPENAI_API_KEY` environment variable instead of specifying `apiKey` in the config.

**Example of .gsloth.config.json for Inception (OpenAI-compatible)**
```json
{
  "llm": {
    "type": "openai",
    "model": "mercury-coder",
    "apiKeyEnvironmentVariable": "INCEPTION_API_KEY",
    "configuration": {
      "baseURL": "https://api.inceptionlabs.ai/v1"
    }
  }
}
```
You can use the `INCEPTION_API_KEY` environment variable as specified in `apiKeyEnvironmentVariable`.

**Example of .gsloth.config.json for Google GenAI**
```json
{
  "llm": {
    "type": "google-genai",
    "model": "gemini-2.5-pro",
    "apiKey": "your-api-key-here"
  }
}
```
You can use the `GOOGLE_API_KEY` environment variable instead of specifying `apiKey` in the config.

**Example of .gsloth.config.json for VertexAI**
```json
{
  "llm": {
    "type": "vertexai",
    "model": "gemini-2.5-pro"
  }
}
```
VertexAI typically uses gcloud authentication; no `apiKey` is needed in the config.

**Example of .gsloth.config.json for Open Router**
```json
{
  "llm": {
    "type": "openrouter",
    "model": "moonshotai/kimi-k2"
  }
}
```

Make sure you either define `OPEN_ROUTER_API_KEY` environment variable or edit your configuration file and set up your key.
When changing a model, make sure you're using a model which supports tools.

**Example of .gsloth.config.json for xAI**
```json
{
  "llm": {
    "type": "xai",
    "model": "grok-4-0709",
    "apiKey": "your-api-key-here"
  }
}
```
You can use the `XAI_API_KEY` environment variable instead of specifying `apiKey` in the config.

### JavaScript Configuration

(.gsloth.config.js or .gsloth.config.mjs)

JavaScript configuration provides more flexibility than JSON configuration, allowing you to use dynamic imports and include custom tools.

**Example with Custom Tools**
```javascript
// .gsloth.config.mjs
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const parrotTool = tool((s) => {
  console.log(s);
}, {
  name: 'parrot_tool',
  description: `This tool will simply print the string`,
  schema: z.string(),
});

export async function configure() {
  const anthropic = await import('@langchain/google-vertexai');
  return {
    llm: new anthropic.ChatVertexAI({
      model: 'gemini-2.5-pro',
    }),
    tools: [
      parrotTool
    ]
  };
}
```

**Example of .gsloth.config.mjs for Anthropic**
```javascript
export async function configure() {
    const anthropic = await import('@langchain/anthropic');
    return {
        llm: new anthropic.ChatAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
            model: "claude-3-5-sonnet-20241022"
        })
    };
}
```

**Example of .gsloth.config.mjs for Groq**
```javascript
export async function configure() {
    const groq = await import('@langchain/groq');
    return {
        llm: new groq.ChatGroq({
            model: "deepseek-r1-distill-llama-70b", // Check other models available
            apiKey: process.env.GROQ_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
        })
    };
}
```

**Example of .gsloth.config.mjs for DeepSeek**
```javascript
export async function configure() {
    const deepseek = await import('@langchain/deepseek');
    return {
        llm: new deepseek.ChatDeepSeek({
            model: 'deepseek-reasoner',
            apiKey: process.env.DEEPSEEK_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
        })
    };
}
```

**Example of .gsloth.config.mjs for OpenAI**
```javascript
export async function configure() {
    const openai = await import('@langchain/openai');
    return {
        llm: new openai.ChatOpenAI({
            model: 'gpt-4o',
            apiKey: process.env.OPENAI_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
        })
    };
}
```

**Example of .gsloth.config.mjs for Inception (OpenAI-compatible)**
```javascript
export async function configure() {
    const openai = await import('@langchain/openai');
    return {
        llm: new openai.ChatOpenAI({
            model: 'mercury-coder',
            apiKey: process.env.INCEPTION_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
            configuration: {
                baseURL: 'https://api.inceptionlabs.ai/v1',
            },
        })
    };
}
```

**Example of .gsloth.config.mjs for Google GenAI**
```javascript
export async function configure() {
  const googleGenai = await import('@langchain/google-genai');
  return {
    llm: new googleGenai.ChatGoogleGenerativeAI({
      model: 'gemini-2.5-pro',
      apiKey: process.env.GOOGLE_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
    })
  };
}
```

**Example of .gsloth.config.mjs for VertexAI**  
VertexAI usually needs `gcloud auth application-default login`
(or both `gcloud auth login` and `gcloud auth application-default login`) and does not need any separate API keys.
```javascript
export async function configure() {
    const vertexAi = await import('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro", // Consider checking for latest recommended model versions
            // API Key from AI Studio should also work
            //// Other parameters might be relevant depending on Vertex AI API updates.
            //// The project is not in the interface, but it is in documentation and it seems to work.
            // project: 'your-cool-google-cloud-project',
        })
    }
}
```

**Example of .gsloth.config.mjs for xAI**
```javascript
export async function configure() {
    const xai = await import('@langchain/xai');
    return {
        llm: new xai.ChatXAI({
            model: 'grok-4-0709',
            apiKey: process.env.XAI_API_KEY, // Default value, but you can provide the key in many different ways, even as literal
        })
    };
}
```

## Using other AI providers

The configure function should simply return instance of langchain [chat model](https://v03.api.js.langchain.com/classes/_langchain_core.language_models_chat_models.BaseChatModel.html).
See [Langchain documentation](https://js.langchain.com/docs/tutorials/llm_chain/) for more details.

## Integration with GitHub Workflows / Actions

Example GitHub workflows integration can be found in [.github/workflows/review.yml](.github/workflows/review.yml)
this example workflow performs AI review on any pushes to Pull Request, resulting in a comment left by,
GitHub actions bot.

## Model Context Protocol (MCP)

Gaunt Sloth Assistant supports the Model Context Protocol (MCP), which provides enhanced context management. You can connect to various MCP servers, including those requiring OAuth authentication.

### OAuth-enabled MCP Servers

Gaunt Sloth now supports OAuth authentication for MCP servers. This has been tested with the Atlassian Jira MCP server.

#### Example: Atlassian Jira MCP Server

To connect to the Atlassian Jira MCP server using OAuth, add the following to your `.gsloth.config.json`:

```json
{
  "llm": {
    "type": "vertexai",
    "model": "gemini-2.5-pro",
    "temperature": 0
  },
  "mcpServers": {
    "jira": {
      "url": "https://mcp.atlassian.com/v1/sse",
      "authProvider": "OAuth",
      "transport": "sse"
    }
  }
}
```

**OAuth Authentication Flow:**
1. When you first use a command that requires the MCP server, your browser will open automatically
2. Complete the OAuth authentication in your browser
3. The authentication tokens are stored securely in `~/.gsloth/.gsloth-auth/`
4. Future sessions will use the stored tokens automatically

**Token Storage:**
- OAuth tokens are stored in JSON files under `~/.gsloth/.gsloth-auth/`
- Each server's tokens are stored in a separate file named after the server URL
- The storage location is cross-platform (Windows, macOS, Linux)

### MCP stdio Server Configuration

To configure local MCP server, add the `mcpServers` section to your configuration file,
for example, configuration for reference sequential thinking MCP follows:

```json
{
  "llm": {
    "type": "vertexai",
    "model": "gemini-2.5-pro"
  },
  "mcpServers": {
    "sequential-thinking": {
      "transport": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    }
  }
}
```

This configuration launches the MCP filesystem server using npx, providing the LLM with access to the specified directory. The server uses stdio for communication with the LLM.

## Content providers

### GitHub Issues

Gaunt Sloth supports GitHub issues as a requirements provider using the GitHub CLI. This integration is simple to use and requires minimal setup.

**Prerequisites:**

1. **GitHub CLI**: Make sure the official [GitHub CLI (gh)](https://cli.github.com/) is installed and authenticated
2. **Repository Access**: Ensure you have access to the repository's issues

**Usage:**

The command syntax is `gsloth pr <prId> [githubIssueId]`. For example:

```shell
gsloth pr 42 23
```

This will review PR #42 and include GitHub issue #23 as requirements.

To explicitly specify the GitHub issue provider:

```shell
gsloth pr 42 23 -p github
```

**Configuration:**

To set GitHub as your default requirements provider, add this to your configuration file:

```json
{
  "llm": {"type": "vertexai", "model": "gemini-2.5-pro"},
  "commands": {
    "pr": {
      "requirementsProvider": "github"
    }
  }
}
```

### JIRA

Gaunt Sloth supports three methods to integrate with JIRA:

#### Atlassian MCP

MCP can be used in `chat` and `code` commands.

Gaunt Sloth has OAuth client for MCP and is confirmed to work with public Jira MCP.

```json
{
  "llm": {
    "type": "vertexai",
    "model": "gemini-2.5-pro",
    "temperature": 0
  },
  "mcpServers": {
    "jira": {
      "url": "https://mcp.atlassian.com/v1/sse",
      "authProvider": "OAuth",
      "transport": "sse"
    }
  }
}
```

#### 1. Modern Jira REST API (Scoped Token)

Jira API is used with `pr` and `review` commands.

This method uses the Atlassian REST API v3 with a Personal Access Token (PAT). It requires your Atlassian Cloud ID.

**Prerequisites:**

1. **Cloud ID**: You can find your Cloud ID by visiting `https://yourcompany.atlassian.net/_edge/tenant_info` while authenticated.

2. **Personal Access Token (PAT)**: Create a PAT with the appropriate permissions from `Atlassian Account Settings -> Security -> Create and manage API tokens -> [Create API token with scopes]`.
   - For issue access, the recommended permission is `read:jira-work` (classic)
   - Alternatively granular access would require: `read:issue-meta:jira`, `read:issue-security-level:jira`, `read:issue.vote:jira`, `read:issue.changelog:jira`, `read:avatar:jira`, `read:issue:jira`, `read:status:jira`, `read:user:jira`, `read:field-configuration:jira`

Refer to JIRA API documentation for more details [https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get)

**Environment Variables Support:**

For better security, you can set the JIRA username, token, and cloud ID using environment variables instead of placing them in the configuration file:

- `JIRA_USERNAME`: Your JIRA username (e.g., `user@yourcompany.com`).
- `JIRA_API_PAT_TOKEN`: Your JIRA Personal Access Token with scopes.
- `JIRA_CLOUD_ID`: Your Atlassian Cloud ID.

If these environment variables are set, they will take precedence over the values in the configuration file.

JSON:

```json
{
  "llm": {"type": "vertexai", "model": "gemini-2.5-pro"},
  "requirementsProvider": "jira",
  "requirementsProviderConfig": {
    "jira": {
      "username": "username@yourcompany.com",
      "token": "YOUR_JIRA_PAT_TOKEN",
      "cloudId": "YOUR_ATLASSIAN_CLOUD_ID"
    }
  }
}
```

Optionally displayUrl can be defined to have a clickable link in the output:

```json
{
  "llm": {"type": "vertexai", "model": "gemini-2.5-pro"},
  "requirementsProvider": "jira",
  "requirementsProviderConfig": {
    "jira": {
      "displayUrl": "https://yourcompany.atlassian.net/browse/"
    }
  }
}
```

JavaScript:

```javascript
export async function configure() {
  const vertexAi = await import('@langchain/google-vertexai');
  return {
    llm: new vertexAi.ChatVertexAI({
      model: "gemini-2.5-pro"
    }),
    requirementsProvider: 'jira',
    requirementsProviderConfig: {
      'jira': {
        username: 'username@yourcompany.com', // Your Jira username/email
        token: 'YOUR_JIRA_PAT_TOKEN',        // Your Personal Access Token
        cloudId: 'YOUR_ATLASSIAN_CLOUD_ID'    // Your Atlassian Cloud ID
      }
    }
  }
}
```

#### 2. Legacy Jira REST API (Unscoped Token)

Jira API is used with `pr` and `review` commands.

This uses the Unscoped API token (Aka Legacy API token) method with REST API v2.

A legacy token can be acquired from `Atlassian Account Settings -> Security -> Create and manage API tokens -> [Create API token without scopes]`.

Example configuration setting up JIRA integration using a legacy API token for both `review` and `pr` commands.
Make sure you use your actual company domain in `baseUrl` and your personal legacy `token`.

**Environment Variables Support:**

For better security, you can set the JIRA username and token using environment variables instead of placing them in the configuration file:

- `JIRA_USERNAME`: Your JIRA username (e.g., `user@yourcompany.com`).
- `JIRA_LEGACY_API_TOKEN`: Your JIRA legacy API token.

If these environment variables are set, they will take precedence over the values in the configuration file.

JSON:

```json
{
  "llm": {"type": "vertexai", "model": "gemini-2.5-pro"},
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
export async function configure() {
  const vertexAi = await import('@langchain/google-vertexai');
  return {
    llm: new vertexAi.ChatVertexAI({
      model: "gemini-2.5-pro"
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

## Development Tools Configuration

The `code` command can be configured with development tools via `commands.code.devTools`. These tools allow the AI to run build, tests, lint, and single tests using the specified commands.

The tools are defined in `src/tools/GthDevToolkit.ts` and include:

- **run_tests**: Executes the full test suite.
- **run_single_test**: Runs a single test file. The test path must be relative.
- **run_lint**: Runs the linter, potentially with auto-fix.
- **run_build**: Builds the project.

These tools execute the configured shell commands and capture their output.

Example configuration including dev tools (from .gsloth.config.json):

```json
{
  "llm": {
    "type": "xai",
    "model": "grok-4-0709"
  },
  "commands": {
    "code": {
      "filesystem": "all",
      "devTools": {
        "run_build": "npm build",
        "run_tests": "npm test",
        "run_lint": "npm run lint-n-fix",
        "run_single_test": "npm test"
      }
    }
  }
}
```

Note: For `run_single_test`, the command can include a placeholder like `${testPath}` for the test file path. p
Security validations are in place to prevent path traversal or injection.

## Server Tools Configuration

Some AI providers provide integrated server tools, such as web search.

**.gsloth.config.json for OpenAI Web Search**
```json
{
  "llm": {
    "type": "openai",
    "model": "gpt-4o"
  },
  "tools": [
    { "type": "web_search_preview" }
  ]
}
```

**.gsloth.config.json for Anthropic Web Search** 
```json
{
  "llm": {
    "type": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "tools": [
    {
      "type": "web_search_20250305",
      "name": "web_search",
      "max_uses": 10
    }
  ]
}
```
