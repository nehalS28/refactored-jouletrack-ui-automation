/**
 * Unit tests for MorpheusPlugin.
 * Tests development-time only functionality and no-op lifecycle methods.
 * 
 * @module plugins/morpheus/morpheus-plugin.test
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MorpheusPlugin, type MorpheusPluginConfig } from './morpheus-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';

describe('MorpheusPlugin', () => {
  let plugin: MorpheusPlugin;
  let mockLogger: StructuredLogger;
  let config: MorpheusPluginConfig;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as StructuredLogger;

    config = {
      enabled: true,
      endpoint: 'http://localhost:3000/morpheus',
      timeout: 5000,
    };

    plugin = new MorpheusPlugin(config, mockLogger);
  });

  describe('Plugin Metadata', () => {
    it('should have correct name and version', () => {
      expect(plugin.name).toBe('morpheus');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(plugin.initialize()).resolves.toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Morpheus plugin initialized (development-time only)'
      );
    });
  });

  describe('Lifecycle Methods (No-Op)', () => {
    it('should have no-op onTestStart', async () => {
      await expect(plugin.onTestStart('test-1', 'Test Name')).resolves.toBeUndefined();
    });

    it('should have no-op onTestEnd', async () => {
      await expect(plugin.onTestEnd('test-1', 'passed', 1000)).resolves.toBeUndefined();
    });

    it('should have no-op onStepExecuted', async () => {
      const step = {
        id: 'step-1',
        text: 'Given I am on the login page',
        type: 'Given' as const,
        status: 'passed' as const,
        duration: 100,
      };
      await expect(plugin.onStepExecuted(step)).resolves.toBeUndefined();
    });

    it('should have no-op onError', async () => {
      const error = new Error('Test error');
      const context = { testId: 'test-1' };
      await expect(plugin.onError(error, context)).resolves.toBeUndefined();
    });

    it('should have no-op flush', async () => {
      await expect(plugin.flush()).resolves.toBeUndefined();
    });

    it('should have no-op dispose', async () => {
      await expect(plugin.dispose()).resolves.toBeUndefined();
    });
  });

  describe('validateSelectors', () => {
    it('should validate selectors and return results', async () => {
      // Mock fetch for this test
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: [
            {
              type: 'selector',
              path: 'src/components/LoginForm.tsx',
              content: '[data-testid="login-button"]',
              similarity: 0.95,
            },
          ],
          suggestions: ['[data-testid="login-submit"]'],
        }),
      });

      const selectors = ['[data-testid="login-button"]'];
      const results = await plugin.validateSelectors(selectors);

      expect(results).toHaveLength(1);
      expect(results[0].selector).toBe('[data-testid="login-button"]');
      expect(results[0].valid).toBe(true);
      expect(results[0].suggestions).toEqual(['[data-testid="login-submit"]']);
      expect(results[0].existingMatches).toHaveLength(1);
    });

    it('should handle invalid selectors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: false,
          matches: [],
          suggestions: ['[data-testid="valid-selector"]'],
        }),
      });

      const selectors = ['#invalid-selector'];
      const results = await plugin.validateSelectors(selectors);

      expect(results).toHaveLength(1);
      expect(results[0].selector).toBe('#invalid-selector');
      expect(results[0].valid).toBe(false);
      expect(results[0].suggestions).toEqual(['[data-testid="valid-selector"]']);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const selectors = ['[data-testid="test"]'];
      const results = await plugin.validateSelectors(selectors);

      expect(results).toHaveLength(1);
      expect(results[0].selector).toBe('[data-testid="test"]');
      expect(results[0].valid).toBe(false);
      expect(results[0].error).toBe('Network error');
    });

    it('should log queries to query log', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: [],
          suggestions: [],
        }),
      });

      const selectors = ['[data-testid="test"]'];
      await plugin.validateSelectors(selectors);

      const queryLog = plugin.getQueryLog();
      expect(queryLog).toHaveLength(1);
      expect(queryLog[0].type).toBe('selector');
      expect(queryLog[0].query).toBe('[data-testid="test"]');
      expect(queryLog[0].found).toBe(true);
    });
  });

  describe('findSimilarSteps', () => {
    it('should find similar step patterns', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: [
            {
              type: 'step',
              path: 'src/steps/login.steps.ts',
              content: 'Given("I am on the login page", async function() {...})',
              similarity: 0.85,
            },
          ],
          suggestions: [],
        }),
      });

      const pattern = 'I am on the login page';
      const results = await plugin.findSimilarSteps(pattern);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('step');
      expect(results[0].path).toBe('src/steps/login.steps.ts');
      expect(results[0].similarity).toBe(0.85);
    });

    it('should log step queries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: false,
          matches: [],
          suggestions: [],
        }),
      });

      await plugin.findSimilarSteps('test pattern');

      const queryLog = plugin.getQueryLog();
      expect(queryLog).toHaveLength(1);
      expect(queryLog[0].type).toBe('step');
      expect(queryLog[0].query).toBe('test pattern');
    });
  });

  describe('fetchSelector', () => {
    it('should fetch CSS selector from component path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: [
            {
              type: 'component',
              path: 'src/components/Button.tsx',
              content: '[data-testid="submit-button"]',
              similarity: 1.0,
            },
          ],
          suggestions: [],
        }),
      });

      const selector = await plugin.fetchSelector('src/components/Button.tsx');

      expect(selector).toBe('[data-testid="submit-button"]');
    });

    it('should return null if component not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: false,
          matches: [],
          suggestions: [],
        }),
      });

      const selector = await plugin.fetchSelector('src/components/NonExistent.tsx');

      expect(selector).toBeNull();
    });

    it('should log component queries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: [{ type: 'component', path: '', content: 'selector', similarity: 1 }],
          suggestions: [],
        }),
      });

      await plugin.fetchSelector('src/components/Test.tsx');

      const queryLog = plugin.getQueryLog();
      expect(queryLog).toHaveLength(1);
      expect(queryLog[0].type).toBe('component');
      expect(queryLog[0].query).toBe('src/components/Test.tsx');
    });
  });

  describe('getQueryLog', () => {
    it('should return empty log initially', () => {
      const log = plugin.getQueryLog();
      expect(log).toEqual([]);
    });

    it('should return copy of query log', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: [],
          suggestions: [],
        }),
      });

      await plugin.validateSelectors(['selector1']);
      const log1 = plugin.getQueryLog();
      
      await plugin.validateSelectors(['selector2']);
      const log2 = plugin.getQueryLog();

      expect(log1).toHaveLength(1);
      expect(log2).toHaveLength(2);
      expect(log1).not.toBe(log2); // Should be different array instances
    });
  });

  describe('Query Timeout', () => {
    it('should respect timeout configuration', async () => {
      const shortTimeoutConfig: MorpheusPluginConfig = {
        enabled: true,
        endpoint: 'http://localhost:3000/morpheus',
        timeout: 100,
      };

      const shortTimeoutPlugin = new MorpheusPlugin(shortTimeoutConfig, mockLogger);

      // Mock a slow response that times out
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('The operation was aborted')), 150);
        })
      );

      const selectors = ['[data-testid="test"]'];
      const results = await shortTimeoutPlugin.validateSelectors(selectors);

      expect(results[0].valid).toBe(false);
      expect(results[0].error).toContain('aborted');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selector array', async () => {
      const results = await plugin.validateSelectors([]);
      expect(results).toEqual([]);
    });

    it('should handle null/undefined in query results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          matches: null,
          suggestions: undefined,
        }),
      });

      const results = await plugin.validateSelectors(['selector']);
      expect(results[0].existingMatches).toEqual([]);
      expect(results[0].suggestions).toEqual([]);
    });

    it('should handle HTTP error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const results = await plugin.validateSelectors(['selector']);
      expect(results[0].valid).toBe(false);
      expect(results[0].error).toContain('Morpheus query failed');
    });
  });
});
