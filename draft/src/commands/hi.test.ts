import { describe, it, expect, vi } from 'vitest';
import { hiCommand } from './hi.js';

describe('hiCommand', () => {
  it('should call the LLM and log the response', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    await hiCommand();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hi! How are you?'));
  });
}); 