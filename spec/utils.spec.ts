import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

// Mock the fs module
let fsUtilsMock = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
};
vi.mock('node:fs', () => fsUtilsMock);

// Mock the systemUtils module
const systemUtilsMock = {
  getCurrentDir: vi.fn(),
  getInstallDir: vi.fn(),
  exit: vi.fn(),
};
vi.mock('#src/systemUtils.js', () => systemUtilsMock);

// Mock the consoleUtils module
const consoleUtilsMock = {
  display: vi.fn(),
  displayError: vi.fn(),
  displayWarning: vi.fn(),
  displaySuccess: vi.fn(),
};
vi.mock('#src/consoleUtils.js', () => consoleUtilsMock);

describe('utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Set up default mock values
    systemUtilsMock.getCurrentDir.mockReturnValue('/mock/current/dir');
    systemUtilsMock.getInstallDir.mockReturnValue('/mock/install/dir');
  });

  describe('generateStandardFileName', () => {
    it('should generate filename with prefix, date, time and command', async () => {
      // Mock the Date object to return a fixed date and time
      const originalDate = global.Date;
      const mockDate = new Date('2025-05-17T21:45:30');
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
      } as typeof Date;

      try {
        // Import the function after mocks are set up
        const { generateStandardFileName, toFileSafeString } = await import('#src/utils.js');

        // Define test commands
        const commands = ['ASK', 'REVIEW', 'PR-123'];

        for (const command of commands) {
          // Act
          const result = generateStandardFileName(command);

          // Assert
          expect(result).toBe(
            `gth_2025-05-17_21-45-30_${toFileSafeString(command.toUpperCase())}.md`
          );
          expect(result).toMatch(/^gth_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_[A-Z0-9-]+\.md$/);

          // Verify parts of the filename
          const parts = result.replace('.md', '').split('_');
          expect(parts[0]).toBe('gth');
          expect(parts[1]).toBe('2025-05-17'); // date
          expect(parts[2]).toBe('21-45-30'); // time
          expect(parts[3]).toBe(toFileSafeString(command.toUpperCase())); // command
        }
      } finally {
        // Restore the original Date
        global.Date = originalDate;
      }
    });
  });

  describe('readFileFromCurrentOrInstallDir', () => {
    it('should read file from current directory if it exists', async () => {
      // Arrange
      const fileName = 'test.file';
      const currentDirPath = '/mock/current/dir';
      const filePath = resolve(currentDirPath, fileName);
      const fileContent = 'file content from current dir';

      fsUtilsMock.readFileSync.mockReturnValue(fileContent);

      // Import the function after mocks are set up
      const { readFileFromCurrentOrInstallDir } = await import('#src/utils.js');

      // Act
      const result = readFileFromCurrentOrInstallDir(fileName);

      // Assert
      expect(result).toBe(fileContent);
      expect(fsUtilsMock.writeFileSync).not.toHaveBeenCalled();
      expect(fsUtilsMock.readFileSync).toHaveBeenCalledWith(filePath, { encoding: 'utf8' });
      expect(systemUtilsMock.getCurrentDir).toHaveBeenCalled();
      expect(systemUtilsMock.getInstallDir).not.toHaveBeenCalled();
      expect(consoleUtilsMock.display).toHaveBeenCalledWith(expect.stringContaining('Reading'));
    });

    it('should read file from install directory if not found in current directory', async () => {
      // Arrange
      const fileName = 'test.file';
      const currentDirPath = '/mock/current/dir';
      const installDirPath = '/mock/install/dir';
      const currentFilePath = resolve(currentDirPath, fileName);
      const installFilePath = resolve(installDirPath, fileName);
      const fileContent = 'file content from install dir';

      // Mock readFileSync to throw ENOENT for a current dir but return content for install dir
      fsUtilsMock.readFileSync
        .mockImplementationOnce(() => {
          const error = new Error('File not found') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        })
        .mockReturnValueOnce(fileContent);

      // Import the function after mocks are set up
      const { readFileFromCurrentOrInstallDir } = await import('#src/utils.js');

      // Act
      const result = readFileFromCurrentOrInstallDir(fileName);

      // Assert
      expect(result).toBe(fileContent);
      expect(fsUtilsMock.writeFileSync).not.toHaveBeenCalled();
      expect(fsUtilsMock.readFileSync).toHaveBeenCalledWith(currentFilePath, { encoding: 'utf8' });
      expect(fsUtilsMock.readFileSync).toHaveBeenCalledWith(installFilePath, { encoding: 'utf8' });
      expect(systemUtilsMock.getCurrentDir).toHaveBeenCalled();
      expect(systemUtilsMock.getInstallDir).toHaveBeenCalled();
      expect(consoleUtilsMock.display).toHaveBeenCalledWith(
        expect.stringContaining('trying install directory')
      );
    });

    it('should exit with error if file not found in either directory', async () => {
      // Arrange
      const fileName = 'test.file';
      const currentDirPath = '/mock/current/dir';
      const installDirPath = '/mock/install/dir';
      const currentFilePath = resolve(currentDirPath, fileName);
      const installFilePath = resolve(installDirPath, fileName);

      // Mock readFileSync to throw ENOENT for both directories
      const enoentError = new Error('File not found') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';

      fsUtilsMock.readFileSync
        .mockImplementationOnce(() => {
          throw enoentError;
        })
        .mockImplementationOnce(() => {
          throw enoentError;
        });

      // Import the function after mocks are set up
      const { readFileFromCurrentOrInstallDir } = await import('#src/utils.js');

      // Act & Assert
      expect(() => readFileFromCurrentOrInstallDir(fileName)).toThrow();
      expect(fsUtilsMock.writeFileSync).not.toHaveBeenCalled();
      expect(fsUtilsMock.readFileSync).toHaveBeenCalledWith(currentFilePath, { encoding: 'utf8' });
      expect(fsUtilsMock.readFileSync).toHaveBeenCalledWith(installFilePath, { encoding: 'utf8' });
      expect(systemUtilsMock.getCurrentDir).toHaveBeenCalled();
      expect(systemUtilsMock.getInstallDir).toHaveBeenCalled();
      expect(consoleUtilsMock.displayError).toHaveBeenCalledWith(
        expect.stringContaining(installFilePath)
      );
    });
  });
});
