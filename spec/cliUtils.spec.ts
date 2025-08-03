import { describe, it, expect } from 'vitest';
import { coerceBooleanOrString, parseBooleanOrString } from '#src/cliUtils.js';

describe('cliUtils', () => {
  describe('parseBooleanOrString', () => {
    it('parses false-like tokens', () => {
      expect(parseBooleanOrString('false')).toEqual({ kind: 'boolean', value: false });
      expect(parseBooleanOrString('False')).toEqual({ kind: 'boolean', value: false });
      expect(parseBooleanOrString('0')).toEqual({ kind: 'boolean', value: false });
      expect(parseBooleanOrString('n')).toEqual({ kind: 'boolean', value: false });
      expect(parseBooleanOrString('NO')).toEqual({ kind: 'boolean', value: false });
    });

    it('parses true-like tokens', () => {
      expect(parseBooleanOrString('true')).toEqual({ kind: 'boolean', value: true });
      expect(parseBooleanOrString('True')).toEqual({ kind: 'boolean', value: true });
      expect(parseBooleanOrString('1')).toEqual({ kind: 'boolean', value: true });
      expect(parseBooleanOrString('y')).toEqual({ kind: 'boolean', value: true });
      expect(parseBooleanOrString('YES')).toEqual({ kind: 'boolean', value: true });
    });

    it('returns string for non-boolean tokens', () => {
      expect(parseBooleanOrString('review.md')).toEqual({ kind: 'string', value: 'review.md' });
      expect(parseBooleanOrString('out/rev.md')).toEqual({ kind: 'string', value: 'out/rev.md' });
      // literal string, not a special token
      expect(parseBooleanOrString(' -w0 ')).toEqual({ kind: 'string', value: '-w0' });
    });

    it('returns none for nullish or empty input', () => {
      expect(parseBooleanOrString(undefined)).toEqual({ kind: 'none' });
      expect(parseBooleanOrString(null)).toEqual({ kind: 'none' });
      expect(parseBooleanOrString('')).toEqual({ kind: 'none' });
      expect(parseBooleanOrString('   ')).toEqual({ kind: 'none' });
    });
  });

  describe('coerceBooleanOrString', () => {
    it('coerces to boolean for boolean-like tokens', () => {
      expect(coerceBooleanOrString('false')).toBe(false);
      expect(coerceBooleanOrString('0')).toBe(false);
      expect(coerceBooleanOrString('n')).toBe(false);
      expect(coerceBooleanOrString('true')).toBe(true);
      expect(coerceBooleanOrString('1')).toBe(true);
      expect(coerceBooleanOrString('y')).toBe(true);
    });

    it('coerces to string for other values', () => {
      expect(coerceBooleanOrString('review.md')).toBe('review.md');
      expect(coerceBooleanOrString('out/rev.md')).toBe('out/rev.md');
      expect(coerceBooleanOrString(' -wn ')).toBe('-wn');
    });

    it('returns undefined for none', () => {
      expect(coerceBooleanOrString(undefined)).toBeUndefined();
      expect(coerceBooleanOrString(null)).toBeUndefined();
      expect(coerceBooleanOrString('   ')).toBeUndefined();
    });
  });
});
