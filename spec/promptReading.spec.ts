import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as prompt from '#src/prompt.js';
import * as systemUtils from '#src/systemUtils.js';
import * as fs from 'node:fs';

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('#src/systemUtils.js', () => ({
  getCurrentDir: vi.fn(),
  getInstallDir: vi.fn(),
}));

describe('prompt reading functions', () => {
  const mockCurrentDir = '/project';
  const mockInstallDir = '/install';

  beforeEach(() => {
    vi.spyOn(systemUtils, 'getCurrentDir').mockReturnValue(mockCurrentDir);
    vi.spyOn(systemUtils, 'getInstallDir').mockReturnValue(mockInstallDir);
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const testCases = [
    { name: 'readGuidelines', filename: 'guidelines.md', acceptsParam: true },
    { name: 'readReviewInstructions', filename: 'review.md', acceptsParam: true },
    { name: 'readBackstory', filename: '.gsloth.backstory.md' },
    { name: 'readSystemPrompt', filename: '.gsloth.system.md' },
    { name: 'readChatPrompt', filename: '.gsloth.chat.md' },
    { name: 'readCodePrompt', filename: '.gsloth.code.md' },
  ];

  testCases.forEach(({ name, filename, acceptsParam }) => {
    describe(name, () => {
      test(`reads ${filename} from .gsloth directory when present`, () => {
        const gslothPath = `${mockCurrentDir}/.gsloth/${filename}`;
        vi.mocked(fs.existsSync).mockImplementation((path) => path === gslothPath);
        vi.mocked(fs.readFileSync).mockReturnValue('gsloth content');

        let func = (prompt as any)[name] as (_?: string) => string;
        let result;
        if (acceptsParam) {
          result = func(filename);
        } else {
          result = func();
        }
        expect(result).toBe('gsloth content');
        expect(fs.readFileSync).toHaveBeenCalledWith(gslothPath, { encoding: 'utf8' });
      });

      test(`reads ${filename} from current directory when not in .gsloth`, () => {
        const installPath = `${mockInstallDir}/${filename}`;

        vi.mocked(fs.existsSync).mockImplementation(
          (path) => path !== `${mockCurrentDir}/.gsloth/${filename}`
        );
        vi.mocked(fs.readFileSync)
          .mockImplementationOnce(() => {
            throw new Error();
          }) // Current dir read fails
          .mockImplementationOnce(() => 'current content'); // Install dir read succeeds

        let func = (prompt as any)[name] as (_?: string) => string;
        let result;
        if (acceptsParam) {
          result = func(filename);
        } else {
          result = func();
        }
        expect(result).toBe('current content');
        expect(fs.readFileSync).toHaveBeenCalledWith(installPath, { encoding: 'utf8' });
      });

      test(`reads ${filename} from install directory when not in .gsloth or current dir`, () => {
        const installPath = `${mockInstallDir}/${filename}`;

        vi.mocked(fs.existsSync).mockImplementation(
          (path) => path !== `${mockCurrentDir}/.gsloth/${filename}`
        );
        vi.mocked(fs.readFileSync)
          .mockImplementationOnce(() => {
            throw new Error();
          }) // Current dir read fails
          .mockImplementationOnce(() => 'install content'); // Install dir read succeeds

        let func = (prompt as any)[name] as (_?: string) => string;
        let result;
        if (acceptsParam) {
          result = func(filename);
        } else {
          result = func();
        }
        expect(result).toBe('install content');
        expect(fs.readFileSync).toHaveBeenCalledWith(installPath, { encoding: 'utf8' });
      });

      test(`throws error when ${filename} not found anywhere`, () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          throw new Error();
        });

        let func = (prompt as any)[name] as (_?: string) => string;
        if (acceptsParam) {
          expect(() => func(filename)).toThrow();
        } else {
          expect(() => func()).toThrow();
        }
      });
    });
  });
});
