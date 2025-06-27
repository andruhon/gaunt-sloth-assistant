import { describe, expect, it, vi } from 'vitest';
import { getDefaultTools } from '#src/config.js';

// Mock the GthFileSystemToolkit
vi.mock('#src/tools/GthFileSystemToolkit.js', () => ({
  default: class MockGthFileSystemToolkit {
    constructor() {}

    getTools() {
      return [
        { name: 'read_file', gthFileSystemType: 'read' },
        { name: 'write_file', gthFileSystemType: 'write' },
        { name: 'list_directory', gthFileSystemType: 'read' },
        { name: 'edit_file', gthFileSystemType: 'write' },
      ];
    }

    getFilteredTools(operations: ('read' | 'write')[]) {
      return this.getTools().filter((tool: any) => operations.includes(tool.gthFileSystemType));
    }
  },
}));

vi.mock('#src/systemUtils.js', () => ({
  getCurrentDir: () => '/test/dir',
}));

describe('Config Tool Functions', () => {
  describe('getDefaultTools', () => {
    it('should return all tools when filesystem is "all"', () => {
      const result = getDefaultTools('all');

      expect(result).toHaveLength(4);
      expect(result.map((t) => t.name)).toEqual([
        'read_file',
        'write_file',
        'list_directory',
        'edit_file',
      ]);
    });

    it('should return no tools when filesystem is "none"', () => {
      const result = getDefaultTools('none');

      expect(result).toEqual([]);
    });

    it('should filter tools based on read/write type', () => {
      const resultRead = getDefaultTools(['read']);
      expect(resultRead.map((t) => t.name)).toEqual(['read_file', 'list_directory']);

      const resultWrite = getDefaultTools(['write']);
      expect(resultWrite.map((t) => t.name)).toEqual(['write_file', 'edit_file']);
    });

    it('should allow both read and write when both are in config', () => {
      const result = getDefaultTools(['read', 'write']);

      expect(result).toHaveLength(4);
      expect(result.map((t) => t.name)).toEqual([
        'read_file',
        'write_file',
        'list_directory',
        'edit_file',
      ]);
    });

    it('should filter filesystem tools based on specific allowed list', () => {
      const result = getDefaultTools(['read_file', 'write_file']);

      expect(result.map((t) => t.name)).toEqual(['read_file', 'write_file']);
    });
  });
});
