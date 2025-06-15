import { describe, expect, it } from 'vitest';
import { runCommandInTestDir } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('Chat Command Integration Tests', () => {
  it('should respond to initial message', () => {
    const output = runCommandInTestDir('npx gth chat "Hello, can you help me?"');

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, ['help', 'assist', 'hello'])).toBe(true);
  });

  it('should start interactive session without initial message', () => {
    const output = runCommandInTestDir('npx gth chat');

    // Check for expected content in the response
    expect(
      checkOutputForExpectedContent(output, 'Gaunt Sloth is ready to chat. Type your prompt.')
    ).toBe(true);
  });

  it('should create chat history file', () => {
    const output = runCommandInTestDir('npx gth chat "Test message"');

    // Check that the response mentions the file path
    expect(checkOutputForExpectedContent(output, 'gth_')).toBe(true);
    expect(checkOutputForExpectedContent(output, '_CHAT.md')).toBe(true);
  });
});
