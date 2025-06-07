# Gaunt Sloth Assistant
[![Tests and Lint](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andruhon/gaunt-sloth-assistant/actions/workflows/ci.yml)

Gaunt GSloth Assistant is a lightweight **command line AI assistant** for software developers
designed to enhance code review quality while reducing cognitive load and time investment on **code reviews**
and pull request diff analysis.

![GSloth Banner](assets/gaunt-sloth-logo.png)

Based on [Langchain.js](https://github.com/langchain-ai/langchainjs)

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
- Saves all responses in .md file in the project directory;
- Anything else you need, when combined with other command line tools.

## Why?

While there are many powerful AI assistants available, Gaunt Sloth Assistant stands out by providing developers with:

1. **Provider flexibility** - Freedom to choose and switch between different AI providers (Google Vertex AI, Anthropic, Groq) based on your specific requirements, performance needs, or compliance policies
2. **Open-source transparency** - Complete visibility into how your code and data are processed, with no vendor lock-in
3. **Command-line integration** - Seamless workflow integration with existing developer tools and processes
4. **Specialized focus** - Purpose-built for code review and PR analysis rather than general-purpose assistance
5. **Extensibility** - GSloth is based on LangChain JS and can be easily extended, configured or augmented in different ways.
6. **Model Context Protocol (MCP)** - Support for MCP allows for enhanced context management.
7. **Cost Effectiveness** - When agentic tools will send a number of requests to figure out a user's intent burning thousands of tokens, gsloth simply sends your diff prefixed with guidelines for review.

Unlike proprietary solutions that restrict you to a single AI provider, Gaunt Sloth empowers developers with choice and control while maintaining the specialized capabilities needed for effective code review.

### To make GSloth work, you need an **API key** from some AI provider, such as:
- Google Vertex AI;
- Anthropic;
- Groq.

## Primary Functions:

`gth` and `gsloth` commands are used interchangeably, both `gsloth pr 42` and `gth pr 42` do the same thing.

### Review PR (Pull Request)
To review PR by PR number:

First make sure the official [GitHub cli (gh)](https://cli.github.com/) is installed
and authenticated to have access to your project.

Open terminal (command line) in your project directory.

Type command: `gsloth pr [desired pull request number]`, for example:

Please note that for higher quality code reviews sloth now has read access and may read files in the current project,
this means that the branch of reviewed PR should be checked out, otherwise Sloth might get confused.
If you are typically review PRs without checking them out and looking at diff only is enough, 
consider setting pr.filesystem to 'none' in your config.

```shell
gsloth pr 42
``` 

Review PR providing a markdown file with requirements and notes.
```shell
gsloth pr 42 -f PROJ-1234.md
```

### GitHub Issues Integration

The command syntax is `gsloth pr <prId> [githubIssueId]`. For example, to review PR #42 and include GitHub issue #23 as requirements:

```shell
gsloth pr 42 37
```

**Prerequisites:**

1. Make sure the official [GitHub CLI (gh)](https://cli.github.com/) is installed and authenticated
2. Ensure you have access to the repository's issues

No further configuration is needed! Gaunt Sloth will automatically fetch the GitHub issue content using the GitHub CLI.

The project review preamble can be modified to reject a pull request immediately if it appears to implement something different from what was requested in the requirements.

Gaunt Sloth also supports JIRA integration as an alternative requirements provider.
For more information on **JIRA** setup and other configuration options, see [CONFIGURATION.md#jira](./docs/CONFIGURATION.md#jira).

### Review any Diff

Review current local changes:
```shell
git --no-pager diff | gsloth review
```

```shell
git --no-pager diff origin/master...yourgitcommithash | gsloth review
```
(helpful to review a subset of PR)

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

## Contributing
Contributors are needed! Feel free to create a PR.
If you are not sure where to start, look for issues with a "good first issue" label.

## Building from repo
See [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## License
License is [MIT](https://opensource.org/license/mit). See [LICENSE](LICENSE)
