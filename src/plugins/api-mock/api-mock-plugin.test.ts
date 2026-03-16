/**
 * Unit tests for ApiMockPlugin.
 * Tests mock registration, URL pattern matching, method filtering,
 * delay configuration, and test isolation.
 * 
 * @module plugins/api-mock/api-mock-plugin.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiMockPlugin, type MockDefinition } from './api-mock-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';

/**
 * Create a mock logger for testing.
 */
function createMockLogger(): StructuredLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setTestId: vi.fn(),
    clearTestId: vi.fn(),
  };
}

describe('ApiMockPlugin', () => {
  let plugin: ApiMockPlugin;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    plugin = new ApiMockPlugin(undefined, mockLogger);
  });

  afterEach(async () => {
    await plugin.dispose();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await plugin.initialize();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Mock plugin initialized',
        expect.any(Object)
      );
    });

    it('should have correct name and version', () => {
      expect(plugin.name).toBe('api-mock');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('mock registration', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should register a mock with exact URL pattern', () => {
      const mockDef: MockDefinition = {
        urlPattern: '/api/users',
        response: { status: 200, body: { users: [] } },
      };

      plugin.mockEndpoint(mockDef);

      const result = plugin.getMock('/api/users', 'GET');
      expect(result).toEqual({ status: 200, body: { users: [] } });
    });

    it('should register a mock with regex URL pattern', () => {
      const mockDef: MockDefinition = {
        urlPattern: /\/api\/users\/\d+/,
        response: { status: 200, body: { id: 1, name: 'Test User' } },
      };

      plugin.mockEndpoint(mockDef);

      const result = plugin.getMock('/api/users/123', 'GET');
      expect(result).toEqual({ status: 200, body: { id: 1, name: 'Test User' } });
    });

    it('should register a mock with glob-like pattern', () => {
      const mockDef: MockDefinition = {
        urlPattern: '/api/users/*',
        response: { status: 200, body: { found: true } },
      };

      plugin.mockEndpoint(mockDef);

      const result = plugin.getMock('/api/users/456', 'GET');
      expect(result).toEqual({ status: 200, body: { found: true } });
    });

    it('should register a mock with specific HTTP method', () => {
      const mockDef: MockDefinition = {
        urlPattern: '/api/users',
        method: 'POST',
        response: { status: 201, body: { created: true } },
      };

      plugin.mockEndpoint(mockDef);

      // Should match POST
      const postResult = plugin.getMock('/api/users', 'POST');
      expect(postResult).toEqual({ status: 201, body: { created: true } });

      // Should not match GET
      const getResult = plugin.getMock('/api/users', 'GET');
      expect(getResult).toBeNull();
    });

    it('should register a mock with custom headers', () => {
      const mockDef: MockDefinition = {
        urlPattern: '/api/data',
        response: {
          status: 200,
          body: { data: 'test' },
          headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
        },
      };

      plugin.mockEndpoint(mockDef);

      const result = plugin.getMock('/api/data', 'GET');
      expect(result).toEqual({
        status: 200,
        body: { data: 'test' },
        headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
      });
    });

    it('should register a mock with delay configuration', () => {
      const mockDef: MockDefinition = {
        urlPattern: '/api/slow',
        response: { status: 200, body: { slow: true } },
        delay: 500,
      };

      plugin.mockEndpoint(mockDef);

      const result = plugin.getMockWithDelay('/api/slow', 'GET');
      expect(result).toEqual({
        response: { status: 200, body: { slow: true } },
        delay: 500,
      });
    });

    it('should log mock registration', () => {
      const mockDef: MockDefinition = {
        urlPattern: '/api/test',
        response: { status: 200 },
      };

      plugin.mockEndpoint(mockDef);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Mock endpoint registered',
        expect.objectContaining({ urlPattern: '/api/test' })
      );
    });
  });

  describe('URL pattern matching', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should match exact URL', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/exact',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/exact', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/exact/extra', 'GET')).toBeNull();
    });

    it('should match regex pattern', () => {
      plugin.mockEndpoint({
        urlPattern: /^\/api\/items\/[a-z]+$/,
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/items/abc', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/items/xyz', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/items/123', 'GET')).toBeNull();
    });

    it('should match glob pattern with single wildcard', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/users/*/profile',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/users/123/profile', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/users/abc/profile', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/users/profile', 'GET')).toBeNull();
    });

    it('should match glob pattern with double wildcard', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/**',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/users', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/users/123/profile', 'GET')).not.toBeNull();
      expect(plugin.getMock('/other/path', 'GET')).toBeNull();
    });

    it('should return first matching mock when multiple patterns match', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/users/*',
        response: { status: 200, body: { type: 'wildcard' } },
      });
      plugin.mockEndpoint({
        urlPattern: '/api/users/123',
        response: { status: 200, body: { type: 'exact' } },
      });

      // First registered mock should match
      const result = plugin.getMock('/api/users/123', 'GET');
      expect(result?.body).toEqual({ type: 'wildcard' });
    });
  });

  describe('HTTP method filtering', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should match any method when method is not specified', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/resource',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/resource', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/resource', 'POST')).not.toBeNull();
      expect(plugin.getMock('/api/resource', 'PUT')).not.toBeNull();
      expect(plugin.getMock('/api/resource', 'DELETE')).not.toBeNull();
    });

    it('should only match specified method', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/resource',
        method: 'DELETE',
        response: { status: 204 },
      });

      expect(plugin.getMock('/api/resource', 'DELETE')).not.toBeNull();
      expect(plugin.getMock('/api/resource', 'GET')).toBeNull();
      expect(plugin.getMock('/api/resource', 'POST')).toBeNull();
    });

    it('should be case-insensitive for method matching', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/resource',
        method: 'post',
        response: { status: 201 },
      });

      expect(plugin.getMock('/api/resource', 'POST')).not.toBeNull();
      expect(plugin.getMock('/api/resource', 'post')).not.toBeNull();
      expect(plugin.getMock('/api/resource', 'Post')).not.toBeNull();
    });
  });

  describe('delay simulation', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should return delay value with mock', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/slow',
        response: { status: 200 },
        delay: 1000,
      });

      const result = plugin.getMockWithDelay('/api/slow', 'GET');
      expect(result?.delay).toBe(1000);
    });

    it('should return undefined delay when not configured', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/fast',
        response: { status: 200 },
      });

      const result = plugin.getMockWithDelay('/api/fast', 'GET');
      expect(result?.delay).toBeUndefined();
    });

    it('should support zero delay', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/instant',
        response: { status: 200 },
        delay: 0,
      });

      const result = plugin.getMockWithDelay('/api/instant', 'GET');
      expect(result?.delay).toBe(0);
    });
  });

  describe('mock clearing', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should clear all mocks', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/users',
        response: { status: 200 },
      });
      plugin.mockEndpoint({
        urlPattern: '/api/posts',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/users', 'GET')).not.toBeNull();
      expect(plugin.getMock('/api/posts', 'GET')).not.toBeNull();

      plugin.clearMocks();

      expect(plugin.getMock('/api/users', 'GET')).toBeNull();
      expect(plugin.getMock('/api/posts', 'GET')).toBeNull();
    });

    it('should log mock clearing', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/test',
        response: { status: 200 },
      });

      plugin.clearMocks();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'All mocks cleared',
        expect.any(Object)
      );
    });
  });

  describe('test isolation', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should clear mocks on test end', async () => {
      plugin.mockEndpoint({
        urlPattern: '/api/test',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/test', 'GET')).not.toBeNull();

      await plugin.onTestEnd('test-1', 'passed', 1000);

      expect(plugin.getMock('/api/test', 'GET')).toBeNull();
    });

    it('should clear mocks regardless of test status', async () => {
      plugin.mockEndpoint({
        urlPattern: '/api/test',
        response: { status: 200 },
      });

      await plugin.onTestEnd('test-1', 'failed', 1000);
      expect(plugin.getMock('/api/test', 'GET')).toBeNull();

      plugin.mockEndpoint({
        urlPattern: '/api/test2',
        response: { status: 200 },
      });

      await plugin.onTestEnd('test-2', 'skipped', 0);
      expect(plugin.getMock('/api/test2', 'GET')).toBeNull();
    });

    it('should allow new mocks after clearing', async () => {
      plugin.mockEndpoint({
        urlPattern: '/api/old',
        response: { status: 200, body: { old: true } },
      });

      await plugin.onTestEnd('test-1', 'passed', 1000);

      plugin.mockEndpoint({
        urlPattern: '/api/new',
        response: { status: 200, body: { new: true } },
      });

      expect(plugin.getMock('/api/old', 'GET')).toBeNull();
      expect(plugin.getMock('/api/new', 'GET')).toEqual({
        status: 200,
        body: { new: true },
      });
    });
  });

  describe('plugin lifecycle', () => {
    it('should handle onTestStart', async () => {
      await plugin.initialize();
      await plugin.onTestStart('test-1', 'Test Name');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'API Mock test started',
        expect.objectContaining({ testId: 'test-1' })
      );
    });

    it('should handle onStepExecuted', async () => {
      await plugin.initialize();
      await plugin.onStepExecuted({
        id: 'step-1',
        text: 'Given I mock an API',
        type: 'Given',
        status: 'passed',
        duration: 100,
      });

      // Should not throw
    });

    it('should handle onError', async () => {
      await plugin.initialize();
      await plugin.onError(new Error('Test error'), { testId: 'test-1' });

      // Should not throw
    });

    it('should handle flush', async () => {
      await plugin.initialize();
      await plugin.flush();

      expect(mockLogger.debug).toHaveBeenCalledWith('API Mock plugin flushed');
    });

    it('should handle dispose', async () => {
      await plugin.initialize();
      plugin.mockEndpoint({
        urlPattern: '/api/test',
        response: { status: 200 },
      });

      await plugin.dispose();

      expect(mockLogger.info).toHaveBeenCalledWith('API Mock plugin disposed');
      expect(plugin.getMock('/api/test', 'GET')).toBeNull();
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should return null for non-matching URL', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/users',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/posts', 'GET')).toBeNull();
    });

    it('should handle empty URL', () => {
      expect(plugin.getMock('', 'GET')).toBeNull();
    });

    it('should handle special characters in URL', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/search?q=test&page=1',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/search?q=test&page=1', 'GET')).not.toBeNull();
    });

    it('should handle URL with encoded characters', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/users/john%20doe',
        response: { status: 200 },
      });

      expect(plugin.getMock('/api/users/john%20doe', 'GET')).not.toBeNull();
    });

    it('should handle mock with null body', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/empty',
        response: { status: 204, body: null },
      });

      const result = plugin.getMock('/api/empty', 'GET');
      expect(result).toEqual({ status: 204, body: null });
    });

    it('should handle mock with undefined body', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/no-body',
        response: { status: 204 },
      });

      const result = plugin.getMock('/api/no-body', 'GET');
      expect(result).toEqual({ status: 204 });
    });
  });

  describe('getMockCount', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    it('should return 0 when no mocks registered', () => {
      expect(plugin.getMockCount()).toBe(0);
    });

    it('should return correct count after registering mocks', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/users',
        response: { status: 200 },
      });
      plugin.mockEndpoint({
        urlPattern: '/api/posts',
        response: { status: 200 },
      });

      expect(plugin.getMockCount()).toBe(2);
    });

    it('should return 0 after clearing mocks', () => {
      plugin.mockEndpoint({
        urlPattern: '/api/test',
        response: { status: 200 },
      });

      plugin.clearMocks();

      expect(plugin.getMockCount()).toBe(0);
    });
  });
});
