# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT: Always read and follow .gsloth.guidelines.md first for development principles, testing patterns, and workflow.**

## Commands

Your current allow list is as follows:
```
"Bash(npm run test:*)",
"Bash(mkdir:*)",
"Bash(npm run lint)",
"Bash(npm run lint:*)",
"Bash(grep:*)",
"Bash(npm run build:*)",
"Bash(npm test)",
"Bash(node safeRm.js:*)"
```

Abstain from using commands outside of this list.

### Building and Testing

```bash
# Build the project
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Format code
npm run format

# Install globally for development
npm install -g ./
```

### Release Process

```bash
# For patch release (e.g., 0.0.8 -> 0.0.9)
npm version patch -m "Release notes"
git push
git push --tags

# For minor release (e.g., 0.0.8 -> 0.1.0)
npm version minor -m "Release notes"
git push
git push --tags

# Create GitHub release
gh release create --notes-from-tag

# Publish to NPM
npm login
npm publish
```

## Codebase Architecture

Gaunt Sloth Assistant is a command line AI assistant for software developers, primarily focused on code reviews and question answering.

### High-Level Structure

1. **Commands**: The application has three main commands:
   - `askCommand`: Handles question answering functionality
   - `reviewCommand`: Handles code review (diffs, PRs)
   - `initCommand`: Sets up project configuration

2. **LLM Providers**: Supports multiple AI providers:
   - Anthropic (Claude)
   - Google Vertex AI (Gemini)
   - Groq

3. **Modules**: Core functionality is organized into modules:
   - `questionAnsweringModule`: Processes questions and provides answers
   - `reviewModule`: Handles code review functionality

4. **Providers**: Systems for fetching content:
   - `file`: Reads from local files
   - `ghPrDiffProvider`: Gets PR diffs using GitHub CLI
   - `jiraIssueProvider`: Fetches Jira issues (supports both modern and legacy APIs)
   - `text`: Generic text provider

### Configuration System

- Configurations are stored in `.gsloth.config.js`, `.gsloth.config.json`, or `.gsloth.config.mjs`
- Guidelines are in `.gsloth.guidelines.md`
- Output files are saved to project root or `.gsloth/` directory if it exists
- Environment variables can be used for API keys (e.g., `ANTHROPIC_API_KEY`, `GROQ_API_KEY`)

## Important Architectural Concepts

1. **Command Pattern**: Commands are separated into module and handler code
2. **Provider Pattern**: Abstract interfaces for fetching content
3. **Configuration-driven**: Heavy use of configuration files
4. **Output Persistence**: All outputs are saved to local files
5. **Integration**: GitHub CLI and Jira integration for PR reviews

## Current Roadmap Items

1. Automate release process
2. Support for local LLMs
3. Allow global configuration
4. Streamline and stabilize configuration
5. Teach assistant to identify important files for prompts
6. Add general chat command
7. Add ability to modify local files within project

**Note: For development workflow, testing patterns, imports, and other development principles, refer to .gsloth.guidelines.md**
