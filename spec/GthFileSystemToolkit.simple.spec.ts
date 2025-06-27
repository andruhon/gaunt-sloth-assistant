import { beforeEach, describe, expect, it, vi } from 'vitest';
import os from 'os';

// Simple mock that allows all operations
const fsMock = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  rename: vi.fn(),
  open: vi.fn(),
  realpath: vi.fn(),
};

// Keep the original path methods for basic functionality
vi.mock('fs/promises', () => fsMock);

describe('GthFileSystemToolkit - Basic Tests', () => {
  let GthFileSystemToolkit: typeof import('#src/tools/GthFileSystemToolkit.js').default;
  let toolkit: InstanceType<typeof import('#src/tools/GthFileSystemToolkit.js').default>;

  beforeEach(async () => {
    vi.resetAllMocks();

    // Mock all fs operations to succeed
    fsMock.realpath.mockImplementation((p) => Promise.resolve(p));
    fsMock.stat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      size: 1024,
      birthtime: new Date('2023-01-01'),
      mtime: new Date('2023-01-02'),
      atime: new Date('2023-01-03'),
      mode: 0o644,
    });

    ({ default: GthFileSystemToolkit } = await import('#src/tools/GthFileSystemToolkit.js'));
  });

  describe('constructor', () => {
    it('should initialize with default allowed directories', () => {
      // Use current working directory which should be allowed
      toolkit = new GthFileSystemToolkit([process.cwd()]);
      expect(toolkit).toBeDefined();
      expect(toolkit.tools).toBeDefined();
      expect(toolkit.tools.length).toBe(12); // All filesystem tools
    });

    it('should have all expected tools', () => {
      toolkit = new GthFileSystemToolkit([process.cwd()]);
      const toolNames = toolkit.tools.map((t) => t.name);

      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('read_multiple_files');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('edit_file');
      expect(toolNames).toContain('create_directory');
      expect(toolNames).toContain('list_directory');
      expect(toolNames).toContain('list_directory_with_sizes');
      expect(toolNames).toContain('directory_tree');
      expect(toolNames).toContain('move_file');
      expect(toolNames).toContain('search_files');
      expect(toolNames).toContain('get_file_info');
      expect(toolNames).toContain('list_allowed_directories');
    });
  });

  describe('basic tool functionality', () => {
    beforeEach(() => {
      // Use a path that should be allowed (current directory)
      toolkit = new GthFileSystemToolkit([process.cwd()]);
    });

    it('read_file tool should be defined and callable', async () => {
      const tool = toolkit.tools.find((t) => t.name === 'read_file')!;
      expect(tool).toBeDefined();
      expect(tool.name).toBe('read_file');
      expect(tool.description).toContain('Read the complete contents of a file');
    });

    it('write_file tool should be defined and callable', async () => {
      const tool = toolkit.tools.find((t) => t.name === 'write_file')!;
      expect(tool).toBeDefined();
      expect(tool.name).toBe('write_file');
      expect(tool.description).toContain('Create a new file or completely overwrite');
    });

    it('list_directory tool should be defined and callable', async () => {
      const tool = toolkit.tools.find((t) => t.name === 'list_directory')!;
      expect(tool).toBeDefined();
      expect(tool.name).toBe('list_directory');
      expect(tool.description).toContain('Get a detailed listing of all files and directories');
    });

    it('list_allowed_directories should return configured directories', async () => {
      const tool = toolkit.tools.find((t) => t.name === 'list_allowed_directories')!;
      const result = await tool.invoke({});

      expect(result).toContain('Allowed directories:');
      expect(result).toContain(process.cwd());
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      toolkit = new GthFileSystemToolkit([process.cwd()]);
    });

    it('should format file sizes correctly', () => {
      const formatSize = toolkit['formatSize'];

      expect(formatSize(0)).toBe('0 B');
      expect(formatSize(512)).toBe('512 B');
      expect(formatSize(1024)).toBe('1.00 KB');
      expect(formatSize(1048576)).toBe('1.00 MB');
    });

    it('should normalize line endings', () => {
      const normalizeLineEndings = toolkit['normalizeLineEndings'];

      expect(normalizeLineEndings('line1\r\nline2\r\n')).toBe('line1\nline2\n');
      expect(normalizeLineEndings('line1\nline2\n')).toBe('line1\nline2\n');
    });

    it('should expand home directory', () => {
      const expandHome = toolkit['expandHome'];

      expect(expandHome('~/test')).toBe(os.homedir() + '/test');
      expect(expandHome('/absolute/path')).toBe('/absolute/path');
      expect(expandHome('relative/path')).toBe('relative/path');
    });
  });
});
