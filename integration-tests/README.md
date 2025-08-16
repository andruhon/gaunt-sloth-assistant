# Gaunt Sloth Assistant Integration Tests

This directory contains integration tests for the Gaunt Sloth Assistant CLI tool.

## Test Structure

Some tests intentionally contain `simple` in their name to indicate,
that fast models with lower intelligence, such as mercury can run them without failing,
moreover they take less tokens, which means they may be run in matrix.

```bash
npm run it inception simple
```

```bash
npm run it groq simple
```

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

Or `npm run it vertexai` or `npm run it groq simple`,

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
