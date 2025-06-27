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

    it('should return only read tools when filesystem is "read"', () => {
      const result = getDefaultTools('read');
      expect(result.map((t) => t.name)).toEqual(['read_file', 'list_directory']);
    });

    it('should work with read in array format', () => {
      const result = getDefaultTools(['read']);
      expect(result.map((t) => t.name)).toEqual(['read_file', 'list_directory']);
    });

    it('should filter filesystem tools based on specific read-only tool names', () => {
      const result = getDefaultTools(['read_file']);
      expect(result.map((t) => t.name)).toEqual(['read_file']);
    });
  });
});
