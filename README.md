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
  - Fetches descriptions (requirements) from Jira and GitHub issues;
- Answers questions about provided code;
- Writes code;
- Saves all responses in .md file in the project directory;
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

Review PR providing a markdown file with requirements and notes.
```shell
gsloth pr 42 -f PROJ-1234.md
```

### GitHub Issues Integration

Gaunt Sloth will refer to a GitHub issue when GitHub provider is configured in .gsloth.config.json file, like:

```json
{
  ...
  "commands": {
    "pr": {
      "requirementsProvider": "github"
    }
  }
}
```

The command syntax is `gsloth pr <prId> [githubIssueId]`. For example, to review PR #42 and include GitHub issue #23 as requirements:

```shell
gsloth pr 42 23
```

**Prerequisites:**

1. Make sure the official [GitHub CLI (gh)](https://cli.github.com/) is installed and authenticated
2. Ensure you have access to the repository's issues

No additional configuration is needed! Gaunt Sloth will automatically fetch the GitHub issue content using the GitHub CLI.

The project review preamble can be modified to reject a pull request immediately if it appears to implement something different from what was requested in the requirements.

Gaunt Sloth also supports JIRA integration as an alternative requirements provider. For more information on JIRA setup and other configuration options, see [CONFIGURATION.md](./docs/CONFIGURATION.md).

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

> Gaunt Sloth currently only functions from the directory which has a configuration file (`.gsloth.config.js`, `.gsloth.config.json`, or `.gsloth.config.mjs`) and `.gsloth.guidelines.md`.
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
