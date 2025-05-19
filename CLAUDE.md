# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Testing

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code with prettier
npm run format

# Install the CLI globally (during development)
npm install -g ./
```

(Important)

- In spec files never import mocked files themselves, mock them, and a tested file should import them.
- Always import the tested file dynamically within the test.
- Mocks are hoisted, so it is better to simply place them at the top of the file to avoid confusion.
- Make sure that beforeEach is always present and always calls vi.resetAllMocks(); as a first thing.
- Create variables with vi.fn() without adding implementations to them, then apply these functions with vi.mock outside of the describe.
- Apply mock implementations and return values to mocks within individual tests.
- When mock implementations are common for all test cases, apply them in beforeEach.
- Make sure test actually testing a function, rather than simply testing the mock.

Example test

```typescript
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {writeFileSync} from "node:fs";

const consoleUtilsMock = {
  display: vi.fn(),
  displayError: vi.fn(),
  displayInfo: vi.fn(),
  displayWarning: vi.fn(),
  displaySuccess: vi.fn(),
  displayDebug: vi.fn(),
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

let fsUtilsMock = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
};
vi.mock('node:fs', () => fsUtilsMock);

describe('specialUtil', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Always reset all mocks in beforeEach

    // Set up default mock values
    fsUtilsMock.existsSync.mockImplementation(() => true);
  });

  it('specialFunction should eventually write test contents to a file', async () => {
    fsMock.readFileSync.mockImplementation((path: string) => {
      if (path.includes('inputFile.txt')) return 'TEST CONTENT';
      return '';
    });

    const {specialFunction} = await import('#src/specialUtil.js'); // Always import tested file within the test
    
    // Function under test
    specialFunction();

    expect(fsUtilsMock.writeFileSync).toHaveBeenCalledWith('outputFile.txt', 'TEST CONTENT\nEXTRA CONTENT');
    expect(consoleUtilsMock.displayDebug).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displayWarning).not.toHaveBeenCalled();
    expect(consoleUtilsMock.display).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displayError).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displayInfo).not.toHaveBeenCalled();
    expect(consoleUtilsMock.displaySuccess).toHaveBeenCalledWith('Successfully transferred to outputFile.txt');
  });
});
```

### Release Process

```bash
# For patch releases (e.g., 0.3.1 to 0.3.2)
npm version patch -m "Release notes"

# For minor releases (e.g., 0.3.1 to 0.4.0)
npm version minor -m "Release notes"

# Push changes and tags
git push
git push --tags

# Create GitHub release
gh release create --notes-from-tag

# Publish to NPM
npm login
npm publish
```

## Code Architecture

The Gaunt Sloth Assistant is a command-line AI assistant for code reviews and question answering, built with TypeScript and Node.js.

### Core Components

1. **Commands** (`src/commands/`):
   - `askCommand.ts` - Question answering functionality
   - `reviewCommand.ts` - Code review functionality
   - `initCommand.ts` - Project initialization

2. **Modules** (`src/modules/`):
   - `questionAnsweringModule.ts` - Handles question answering workflow
   - `reviewModule.ts` - Handles code review workflow
   - `types.ts` - Shared type definitions

3. **Configuration** (`src/config.ts`):
   - Loads configuration from `.gsloth.config.json`, `.gsloth.config.js`, or `.gsloth.config.mjs`
   - Supports directory-based configuration with `.gsloth` directory

4. **LLM Integration** (`src/llmUtils.ts`):
   - Uses LangChain.js for integrating with LLM providers
   - Supports Anthropic, Google Vertex AI, and Groq

5. **Content Providers** (`src/providers/`):
   - `ghPrDiffProvider.ts` - GitHub PR content
   - `jiraIssueProvider.ts` - JIRA issue content
   - `jiraIssueLegacyProvider.ts` - Legacy JIRA integration
   - `file.ts` - File content
   - `text.ts` - Raw text content

### Data Flow

1. Command-line arguments are parsed using Commander.js
2. Configuration is loaded from the project directory
3. Commands delegate to specialized modules for execution
4. Modules interact with content providers to gather data
5. LLM is invoked with formatted prompts
6. Responses are saved to files and displayed to the user

### Configuration Structure

The application uses a flexible configuration system:
- Configuration can be stored in JSON or JavaScript format
- Files can be in project root or in `.gsloth/.gsloth-settings/` directory
- Output files can be stored in project root or in `.gsloth/` directory

## Best Practices

When developing for this project:

1. Follow TypeScript best practices with proper typing
2. Maintain the existing modular architecture
3. Add appropriate unit tests for new functionality
4. Update documentation when adding new features
5. Keep configuration backward compatible
6. Test with multiple LLM providers when possible
