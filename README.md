# Gaunt Sloth Assistant
[![Tests and Lint](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml) [![Integration Tests (Anthropic)](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/it.yml/badge.svg?event=push)](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/it.yml)

Gaunt GSloth Assistant is a lightweight **command line AI assistant**
built with TypeScript (JavaScript) and distributed via NPM with minimum dependencies.

![GSloth Banner](assets/gaunt-sloth-logo.png)

Based on [LangChain.js](https://github.com/langchain-ai/langchainjs)

## Why?

There are many Open Source command line AI assistants available, such as Aider and Goose;
there are great non-open source options such as Claude Code.

Gaunt Sloth does not intend to be your "Daily Driver" and is not aiming to replace your Cursor.
What it promises is that it is small, extendable, cross-platform and can itself be a dependency in your project.

The GSloth was initially built as a code review tool, fetching PR contents and Jira contents before feeding them to
the LLM, but we ourselves found many more use cases which we initially did not anticipate; for example,
we may have it as a dependency in an MCP project, allowing us to quickly spin it up to simulate or test some use cases.

The promise of Gaunt Sloth:

- **Minimum dependencies**. Ideally, we aim to only have CommanderJS and some packages from LangChainJS and LangGraphJS.
- **Extensibility**. Feel free to write some JS and create your Tool, Provider or connect to the MCP server of your choice.
- **No vendor lock-in**. Just BYO API keys.
- **Easy installation via NPM**.
- **All prompts are editable** via markdown files.
- **No UI**. Command Line only, with intent to be used as a dependency, potentially in your build pipeline.
  Of course, you can use Gaunt Sloth as a dependency and hook your own UI.

## What GSloth does:

- Reviews code;
  - Suggests bug fixes;
  - Explains provided code
- Reviews Diffs provided with pipe (|);
  - You can ask GSloth to review your own code before committing (`git --no-pager diff | gsloth review`).
- Reviews Pull Requests (PRs) (`gsloth pr 42`);
  - Fetches descriptions (requirements) from Github issue or Jira (`gsloth pr 42 12`);;
- Answers questions about provided code;
- Writes code;
- Connects to MCP server;
- Saves all responses in .md file in the project directory;
- Anything else you need, when combined with other command line tools.

### To make GSloth work, you need an **API key** from some AI provider, such as:

- Google Vertex AI;
- Anthropic;
- Groq;
- DeepSeek.

`*` Any other provider supported by LangChain.JS should also work with [JS config](./docs/CONFIGURATION.md#JavaScript-Configuration).

## Commands Overview

`gth` and `gsloth` commands are used interchangeably, both `gsloth pr 42` and `gth pr 42` do the same thing.

For detailed information about all commands, see [docs/COMMANDS.md](./docs/COMMANDS.md).

### Available Commands:

- **`init`** - Initialize Gaunt Sloth in your project with a specific AI provider
- **`pr`** - ⚠️ This feature requires GitHub CLI to be installed. Review pull requests with optional requirement integration (GitHub issues or Jira).
- **`review`** - Review any diff or content from various sources
- **`ask`** - Ask questions about code or programming topics
- **`chat`** - Start an interactive chat session
- **`code`** - Write code interactively with full project context

### Quick Examples:

**Initialize project:**
```shell
gsloth init anthropic
```

**Review PR with requirements:**
```shell
gsloth pr 42 23  # Review PR #42 with GitHub issue #23
```

**Review local changes:**
```shell
git --no-pager diff | gsloth review
```

**Ask questions:**
```shell
gsloth ask "What does this function do?" -f utils.js
```

**Interactive sessions:**
```shell
gsloth chat  # Start chat session
gsloth code  # Start coding session
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
Currently, vertexai, anthropic, groq and deepseek can be configured with `gsloth init [vendor]`.

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

### DeepSeek
```shell
cd ./your-project
gsloth init deepseek
```
Make sure you either define `DEEPSEEK_API_KEY` environment variable or edit your configuration file and set up your key.
It is recommended to obtain API key from DeepSeek official website rather than from a reseller.

### Other AI providers
Any other AI provider supported by Langchain.js can be configured with js [Config](./docs/CONFIGURATION.md). 

## Contributing
Contributors are needed! Feel free to create a PR.
If you are not sure where to start, look for issues with a "good first issue" label.

## Building from repo
See [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## License
License is [MIT](https://opensource.org/license/mit). See [LICENSE](LICENSE)
