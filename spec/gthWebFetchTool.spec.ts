import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from '#src/tools/gthWebFetchTool.js';
import { GthConfig } from '#src/config.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('gth_web_fetch tool', () => {
  let tool: any;
  const mockConfig: GthConfig = {} as GthConfig;

  beforeEach(() => {
    tool = get(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('gth_web_fetch');
    });

    it('should have correct tool description', () => {
      expect(tool.description).toBe(
        'Fetch content from a web URL. Provide a valid HTTP/HTTPS URL and get the content as text.'
      );
    });
  });

  describe('URL Validation', () => {
    it('should return error message for undefined URL', async () => {
      const result = await tool.invoke(undefined);
      expect(result).toContain('Invalid URL provided');
    });

    it('should return error message for empty string URL', async () => {
      const result = await tool.invoke('');
      expect(result).toContain('Invalid URL provided');
    });

    it('should return error message for whitespace-only URL', async () => {
      const result = await tool.invoke('   ');
      expect(result).toContain('Invalid URL provided');
    });

    it('should return error message for URL without http protocol', async () => {
      const result = await tool.invoke('www.example.com');
      expect(result).toContain('URL must start with http:// or https://');
    });

    it('should return error message for URL with ftp protocol', async () => {
      const result = await tool.invoke('ftp://example.com');
      expect(result).toContain('URL must start with http:// or https://');
    });

    it('should return error message for URL with file protocol', async () => {
      const result = await tool.invoke('file://example.txt');
      expect(result).toContain('URL must start with http:// or https://');
    });

    it('should accept valid HTTP URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('test content'),
      });

      const result = await tool.invoke('http://example.com');
      expect(result).toBe('test content');
    });

    it('should accept valid HTTPS URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('test content'),
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toBe('test content');
    });
  });

  describe('HTTP Request Configuration', () => {
    it('should call fetch with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      });

      await tool.invoke('https://example.com');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
    });

    it('should include Accept header in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      });

      await tool.invoke('https://example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'text/*',
          }),
        })
      );
    });

    it('should include Accept-Language header in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      });

      await tool.invoke('https://example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Language': 'en-US,en;q=0.9',
          }),
        })
      );
    });

    it('should include Accept-Encoding header in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      });

      await tool.invoke('https://example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Encoding': 'gzip, deflate, br',
          }),
        })
      );
    });
  });

  describe('HTTP Response Handling', () => {
    it('should return content for successful 200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success content'),
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toBe('success content');
    });

    it('should return error message for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Failed to fetch data from https://example.com with status: 404 - Not Found'
      );
    });

    it('should return error message for 500 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Failed to fetch data from https://example.com with status: 500 - Internal Server Error'
      );
    });

    it('should return error message for 403 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Failed to fetch data from https://example.com with status: 403 - Forbidden'
      );
    });

    it('should handle empty response content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(''),
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toBe('');
    });

    it('should handle HTML response content', async () => {
      const htmlContent = '<html><body>Test</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(htmlContent),
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toBe(htmlContent);
    });

    it('should handle JSON response content', async () => {
      const jsonContent = '{"key": "value"}';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(jsonContent),
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toBe(jsonContent);
    });

    it('should handle large response content', async () => {
      const largeContent = 'a'.repeat(10000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(largeContent),
      });

      const result = await tool.invoke('https://example.com');
      expect(result).toBe(largeContent);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout error', async () => {
      const timeoutError = new Error('Network timeout');
      mockFetch.mockRejectedValueOnce(timeoutError);

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Error occurred while fetching content from https://example.com: Network timeout'
      );
    });

    it('should handle DNS resolution error', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      mockFetch.mockRejectedValueOnce(dnsError);

      const result = await tool.invoke('https://nonexistent.domain');
      expect(result).toContain(
        'Error occurred while fetching content from https://nonexistent.domain: getaddrinfo ENOTFOUND'
      );
    });

    it('should handle connection refused error', async () => {
      const connectionError = new Error('connect ECONNREFUSED');
      mockFetch.mockRejectedValueOnce(connectionError);

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Error occurred while fetching content from https://example.com: connect ECONNREFUSED'
      );
    });

    it('should handle SSL certificate error', async () => {
      const sslError = new Error('certificate verify failed');
      mockFetch.mockRejectedValueOnce(sslError);

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Error occurred while fetching content from https://example.com: certificate verify failed'
      );
    });

    it('should handle non-Error thrown objects', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Unknown error occurred while fetching content from https://example.com: string error'
      );
    });

    it('should handle null thrown objects', async () => {
      mockFetch.mockRejectedValueOnce(null);

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Unknown error occurred while fetching content from https://example.com: null'
      );
    });

    it('should handle undefined thrown objects', async () => {
      mockFetch.mockRejectedValueOnce(undefined);

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Unknown error occurred while fetching content from https://example.com: undefined'
      );
    });

    it('should handle numeric thrown objects', async () => {
      mockFetch.mockRejectedValueOnce(404);

      const result = await tool.invoke('https://example.com');
      expect(result).toContain(
        'Unknown error occurred while fetching content from https://example.com: 404'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('query content'),
      });

      const result = await tool.invoke('https://example.com?param=value&other=test');
      expect(result).toBe('query content');
    });

    it('should handle URL with fragment identifier', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('fragment content'),
      });

      const result = await tool.invoke('https://example.com#section');
      expect(result).toBe('fragment content');
    });

    it('should handle URL with port number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('port content'),
      });

      const result = await tool.invoke('https://example.com:8080');
      expect(result).toBe('port content');
    });

    it('should handle URL with authentication credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('auth content'),
      });

      const result = await tool.invoke('https://user:pass@example.com');
      expect(result).toBe('auth content');
    });

    it('should handle URL with international domain name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('international content'),
      });

      const result = await tool.invoke('https://例え.テスト');
      expect(result).toBe('international content');
    });

    it('should handle very long URL', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('long url content'),
      });

      const result = await tool.invoke(longUrl);
      expect(result).toBe('long url content');
    });

    it('should handle URL with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('special char content'),
      });

      const result = await tool.invoke('https://example.com/path with spaces');
      expect(result).toBe('special char content');
    });

    it('should handle localhost URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('localhost content'),
      });

      const result = await tool.invoke('http://localhost:3000');
      expect(result).toBe('localhost content');
    });

    it('should handle IP address URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('ip content'),
      });

      const result = await tool.invoke('http://192.168.1.1');
      expect(result).toBe('ip content');
    });
  });

  describe('Configuration', () => {
    it('should accept any GthConfig parameter', () => {
      const customConfig = { customProperty: 'value' } as any;
      const customTool = get(customConfig);
      expect(customTool.name).toBe('gth_web_fetch');
    });

    it('should work with empty config object', () => {
      const emptyConfig = {} as GthConfig;
      const toolWithEmptyConfig = get(emptyConfig);
      expect(toolWithEmptyConfig.name).toBe('gth_web_fetch');
    });
  });
});
