import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the fileUtils module for log stream functions
const fileUtilsMock = {
  initLogStream: vi.fn(),
  writeToLogStream: vi.fn(),
  closeLogStream: vi.fn(),
};

vi.mock('#src/fileUtils.js', () => fileUtilsMock);

// Mock Node.js built-in modules for debug logging
vi.mock('node:fs', () => ({
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('node:path', () => ({
  resolve: vi.fn((path) => path),
  dirname: vi.fn((path) => path),
}));

vi.mock('node:util', () => ({
  inspect: vi.fn((obj) => JSON.stringify(obj)),
}));

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock process.stdout.write
const processMock = {
  stdout: {
    write: vi.fn(),
  },
};

// Replace console and process globally for the test
global.console = consoleMock as any;
global.process = { ...process, ...processMock } as any;

describe('consoleUtils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // No need to mock getUseColour anymore - it's internal to consoleUtils
  });

  describe('initSessionLogging', () => {
    it('should initialize session logging when enabled', async () => {
      // Import the function after mocks are set up
      const { initSessionLogging } = await import('#src/consoleUtils.js');

      const logFileName = 'test-session.log';

      // Act
      initSessionLogging(logFileName, true);

      // Assert
      expect(fileUtilsMock.initLogStream).toHaveBeenCalledWith(logFileName);
    });

    it('should not initialize session logging when disabled', async () => {
      // Import the function after mocks are set up
      const { initSessionLogging } = await import('#src/consoleUtils.js');

      const logFileName = 'test-session.log';

      // Act
      initSessionLogging(logFileName, false);

      // Assert
      expect(fileUtilsMock.initLogStream).not.toHaveBeenCalled();
    });
  });

  describe('stopSessionLogging', () => {
    it('should close log stream and reset state', async () => {
      // Import the functions after mocks are set up
      const { initSessionLogging, stopSessionLogging } = await import('#src/consoleUtils.js');

      // Set up session logging first
      initSessionLogging('test.log', true);

      // Act
      stopSessionLogging();

      // Assert
      expect(fileUtilsMock.closeLogStream).toHaveBeenCalled();
    });
  });

  describe('display functions', () => {
    beforeEach(async () => {
      // Import and initialize session logging for each test
      const { initSessionLogging } = await import('#src/consoleUtils.js');
      initSessionLogging('test.log', true);
    });

    describe('displayError', () => {
      it('should display error message and log to session', async () => {
        // Import the function after mocks are set up
        const { displayError } = await import('#src/consoleUtils.js');

        const message = 'Test error message';

        // Act
        displayError(message);

        // Assert
        expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining(message)); // Without colors
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n');
      });

      it('should display colored error when colors enabled', async () => {
        // Import the functions after mocks are set up
        const { displayError, setUseColour } = await import('#src/consoleUtils.js');

        // Enable colors
        setUseColour(true);

        const message = 'Test error message';

        // Act
        displayError(message);

        // Assert
        expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining('\x1b[31m')); // Red color
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n'); // Clean message
      });
    });

    describe('displayWarning', () => {
      it('should display warning message and log to session', async () => {
        // Import the function after mocks are set up
        const { displayWarning } = await import('#src/consoleUtils.js');

        const message = 'Test warning message';

        // Act
        displayWarning(message);

        // Assert
        expect(consoleMock.warn).toHaveBeenCalledWith(expect.stringContaining(message));
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n');
      });
    });

    describe('displaySuccess', () => {
      it('should display success message and log to session', async () => {
        // Import the function after mocks are set up
        const { displaySuccess } = await import('#src/consoleUtils.js');

        const message = 'Test success message';

        // Act
        displaySuccess(message);

        // Assert
        expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining(message));
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n');
      });
    });

    describe('displayInfo', () => {
      it('should display info message and log to session', async () => {
        // Import the function after mocks are set up
        const { displayInfo } = await import('#src/consoleUtils.js');

        const message = 'Test info message';

        // Act
        displayInfo(message);

        // Assert
        expect(consoleMock.info).toHaveBeenCalledWith(expect.stringContaining(message));
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n');
      });
    });

    describe('display', () => {
      it('should display plain message and log to session', async () => {
        // Import the function after mocks are set up
        const { display } = await import('#src/consoleUtils.js');

        const message = 'Test plain message';

        // Act
        display(message);

        // Assert
        expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining(message));
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n');
      });
    });

    describe('displayDebug', () => {
      it('should display debug message and log to session', async () => {
        // Import the function after mocks are set up
        const { displayDebug } = await import('#src/consoleUtils.js');

        const message = 'Test debug message';

        // Act
        displayDebug(message);

        // Assert
        expect(consoleMock.debug).toHaveBeenCalledWith(message);
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(message + '\n');
      });

      it('should handle Error objects', async () => {
        // Import the function after mocks are set up
        const { displayDebug } = await import('#src/consoleUtils.js');

        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at test.js:1:1';

        // Act
        displayDebug(error);

        // Assert
        expect(consoleMock.debug).toHaveBeenCalledWith(error.stack);
        expect(fileUtilsMock.writeToLogStream).toHaveBeenCalledWith(error.stack + '\n');
      });

      it('should handle undefined values', async () => {
        // Import the function after mocks are set up
        const { displayDebug } = await import('#src/consoleUtils.js');

        // Act
        displayDebug(undefined);

        // Assert - nothing should be called for undefined
        expect(consoleMock.debug).not.toHaveBeenCalled();
        expect(fileUtilsMock.writeToLogStream).not.toHaveBeenCalled();
      });
    });
  });

  describe('defaultStatusCallback', () => {
    it('should handle all status levels correctly', async () => {
      // Import functions after mocks are set up
      const { defaultStatusCallback } = await import('#src/consoleUtils.js');

      // Test info level
      defaultStatusCallback('info', 'Info message');
      expect(consoleMock.info).toHaveBeenCalledWith(expect.stringContaining('Info message'));

      // Test stream level
      defaultStatusCallback('stream', 'Stream message');
      expect(processMock.stdout.write).toHaveBeenCalledWith('Stream message');
    });
  });

  describe('formatInputPrompt', () => {
    it('should format input prompt without colors when disabled', async () => {
      // Import the function after mocks are set up
      const { formatInputPrompt } = await import('#src/consoleUtils.js');

      const message = 'Enter input:';

      // Act
      const result = formatInputPrompt(message);

      // Assert - should return the original message without colors
      expect(result).toContain(message);
    });

    it('should format input prompt with colors when enabled', async () => {
      // Import the functions after mocks are set up
      const { formatInputPrompt, setUseColour } = await import('#src/consoleUtils.js');

      // Enable colors
      setUseColour(true);

      const message = 'Enter input:';

      // Act
      const result = formatInputPrompt(message);

      // Assert - should contain ANSI color codes for magenta
      expect(result).toContain('\x1b[35m'); // Magenta color code
      expect(result).toContain(message);
    });
  });

  describe('session logging with disabled state', () => {
    it('should not log to session when logging is disabled', async () => {
      // Import functions after mocks are set up
      const { display, initSessionLogging } = await import('#src/consoleUtils.js');

      // Initialize with session logging disabled
      initSessionLogging('test.log', false);

      const message = 'Test message';

      // Act
      display(message);

      // Assert - console should be called but not session logging
      expect(consoleMock.log).toHaveBeenCalledWith(expect.stringContaining(message));
      expect(fileUtilsMock.writeToLogStream).not.toHaveBeenCalled();
    });
  });
});
