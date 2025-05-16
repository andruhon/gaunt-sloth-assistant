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
