# Gaunt Sloth Assistant
[![Tests and Lint](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml)

Gaunt Sloth Assistant is a Simplistic **command line AI assistant**
for software developers,
who wish to reduce cognitive load and time spending on **code reviews** (and pull request diff reviews).

Based on [Langchain.js](https://github.com/langchain-ai/langchainjs)

## What GSloth does:
- Reviews code;
  - Suggests bug fixes;
  - Explains provided code
- Reviews Diffs provided with pipe (|);
  - You can ask GSloth to review your own code before committing.
- Reviews Pull Requests (PRs);
  - Fetches descriptions (requirements) from Jira;
- Answers questions about provided code;
- Writes code;
- Saves all responses to the project directory;
- Anything else you need, when combined with other command line tools.

### To make GSloth work, you need an **API key** from some AI provider, such as:
- Google Vertex AI;
- Anthropic;
- Groq.

## Primary Functions:

### Review PR (Pull Request)
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

### JIRA Integration

When JIRA integration is configured, the JIRA issue text can be included alongside the diff for review.
The project review preamble can be modified to reject a pull request immediately
if it appears to implement something different from what was requested in the requirements.

The command syntax is generally `gsloth pr <prId> [requirementsId]`,
for example, the snippet below does review of PR 42 and
supplies description of JIRA issue with number PP-4242:

```shell
gsloth pr 42 PP-4242
```

Gaunt Sloth supports two methods to integrate with JIRA scoped tokens and unscoped tokens:

#### Modern Jira REST API (Scoped Token)

This method uses the Atlassian REST API v3 with a Personal Access Token (PAT). It requires your Atlassian Cloud ID.

**Prerequisites:**

1. **Cloud ID**: You can find your Cloud ID by visiting `https://yourcompany.atlassian.net/_edge/tenant_info` while authenticated.

2. **Personal Access Token (PAT)**: Create a PAT with the appropriate permissions from `Atlassian Account Settings -> Security -> Create and manage API tokens -> [Create API token with scopes]`.
   - For issue access, the recommended permission is `read:jira-work` (classic)

Example configuration:

```json
{
  "llm": {"type": "vertexai", "model": "gemini-2.5-pro-preview-05-06"},
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

For better security, you can set these values using environment variables:
- `JIRA_USERNAME`: Your JIRA username (e.g., `user@yourcompany.com`).
- `JIRA_API_PAT_TOKEN`: Your JIRA Personal Access Token with scopes.
- `JIRA_CLOUD_ID`: Your Atlassian Cloud ID.

For more detailed information, see [CONFIGURATION.md](./docs/CONFIGURATION.md).

For setup with legacy Unscoped tokens please refer to [CONFIGURATION.md](./docs/CONFIGURATION.md).

### Review any Diff
```shell
git --no-pager diff origin/master...yourgitcommithash | gsloth review
```
(helpful to review a subset of PR)

Review current local changes:
```shell
git --no-pager diff | gsloth review
```

### Question Answering
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

### NPM
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

### Other AI providers
Any other AI provider supported by Langchain.js can be configured with js [Config](./docs/CONFIGURATION.md). 

## Building from repo
See [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## License
License is [MIT](https://opensource.org/license/mit). See [LICENSE](LICENSE)
