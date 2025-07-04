# Gaunt Sloth Assistant Integration Tests

This directory contains integration tests for the Gaunt Sloth Assistant CLI tool.

## Test Structure

The tests are organized as follows:

- **Test Files**:
    - `askCommand.it.ts`: Tests for the ask command
    - `reviewCommand.it.ts`: Tests for the review command
    - `prCommand.it.ts`: Tests for the PR command

- **Support Files**:
    - `support/commandRunner.ts`: Helper function to run commands in the test directory
    - `support/outputChecker.ts`: Helper function to check command output
    - `support/reviewScoreExtractor.ts`: Helper function to extract review score

- **Configuration**:
    - `.gsloth.config.json`: Claude-based configuration for testing
    - `.gsloth.guidelines.md`: Guidelines for the AI to follow during testing

- **Test Data**:
    - `test-data/filewithgoodcode.js`: Sample good code for review tests
    - `test-data/filewithbadcode.js`: Sample bad code with intentional issues for review tests

## Running the Tests

To run the integration tests:

1. Make sure you have an Anthropic, VertexAI or Groq API key set in your environment:
   ```
   export ANTHROPIC_API_KEY=your-api-key
   ```

2. Build

  ```
  npm run build
  ```

3. Navigate to the project root directory and run:
   ```
   npm run it anthropic
   ```

Or `npm run it vertexai` or `npm run it groq`,
please note if you are on free tier of Groq review and PR tests are likely to fail,
because tokens limit has been hit.

   Or run a specific test file:
   ```
   npm run it anthropic askCommand.it.ts
   npm run it anthropic reviewCommand.it.ts
   npm run it anthropic prCommand.it.ts
   ```

## Notes

- These tests require the GitHub CLI to be installed and authenticated
- The tests use real GitHub PRs and issues for testing
- The tests expect specific responses from the AI based on the content of the PRs and issues
- The test data files in the `test-data` directory are used for code review tests
