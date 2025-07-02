import { describe, expect, it } from 'vitest';
import { runCommandWithArgs } from './support/commandRunner';
import { checkOutputForExpectedContent } from './support/outputChecker';

describe('Chat Command Integration Tests', () => {
  it('should respond to initial message', async () => {
    const output = await runCommandWithArgs(
      'npx',
      ['gth', 'chat', '"Hello, can you help me?"'],
      ' >'
    );

    // Check for expected content in the response
    expect(checkOutputForExpectedContent(output, ['help', 'assist', 'hello'])).toBe(true);
    // Check that the response mentions the file path
    expect(checkOutputForExpectedContent(output, 'gth_')).toBe(true);
    expect(checkOutputForExpectedContent(output, '_CHAT.md')).toBe(true);
    expect(checkOutputForExpectedContent(output, 'write_file')).toBe(false);
    expect(checkOutputForExpectedContent(output, 'edit_file')).toBe(false);
  });

  it('should start interactive session without initial message', async () => {
    const output = await runCommandWithArgs('npx', ['gth', 'chat'], ' >');

    // Check for expected content in the response
    expect(
      checkOutputForExpectedContent(output, 'Gaunt Sloth is ready to chat. Type your prompt.')
    ).toBe(true);

    expect(checkOutputForExpectedContent(output, 'write_file')).toBe(false);
    expect(checkOutputForExpectedContent(output, 'edit_file')).toBe(false);
  });
});
