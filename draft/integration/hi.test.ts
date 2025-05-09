import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('CLI Integration', () => {
  it('should respond with the expected greeting', () => {
    const output = execSync('npx zobo hi').toString();
    expect(output).toContain('Hi! How are you?');
  });
}); 