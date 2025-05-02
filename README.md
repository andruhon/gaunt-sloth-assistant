# Gaunt Sloth Assistant
[![Tests and Lint](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml)

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
            'jira-legacy': {
                username: 'user.name@company.com', // Your Jira username/email
                token: 'YOURSECRETTOKEN',     // Replace with your real Jira API token
                baseUrl: 'https://yourcompany.atlassian.net/rest/api/2/issue/'  // Your Jira instance base URL
            }
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

Multiple files may be provided as well

```shell
gsloth ask "Please have a look at these files" -f index.js test.js
```

## Installation

Tested with Node 22 LTS.

## NPM
```shell
npm install gaunt-sloth-assistant -g
```

## Configuration

> Gaunt Sloth currently only functions from the directory which has a configuration file (`.gsloth.config.js`, `.gsloth.config.json`, or `.gsloth.config.mjs`) and `.gsloth.preamble.review.md`.
> Global configuration to invoke gsloth anywhere is in [ROADMAP](ROADMAP.md).

Configuration can be created with `gsloth init [vendor]` command.
Currently, vertexai, anthropic and groq can be configured with `gsloth init [vendor]`.

More detailed information on configuration can be found in [CONFIGURATION.md](./docs/CONFIGURATION.md)

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

## Building from repo
See [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## License
License is [MIT](https://opensource.org/license/mit). See [LICENSE](LICENSE)
