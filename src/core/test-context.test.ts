/**
 * Unit tests for TestContext interface and factory.
 * 
 * @module core/test-context.test
 * @requirements 15.2, 14.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestContextFactory } from './test-context.js';
import type { FrameworkConfig, TestContext } from '../types/index.js';

/**
 * Create a minimal valid FrameworkConfig for testing.
 */
function createTestConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
  return {
    environment: 'local',
    baseUrl: 'http://localhost:3000',
    browser: {
      name: 'chrome',
      headless: true,
      windowSize: { width: 1920, height: 1080 },
      args: [],
    },
    timeouts: {
      implicit: 0,
      explicit: 10000,
      pageLoad: 30000,
      script: 30000,
      polling: 500,
    },
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },
    parallel: {
      enabled: false,
      workers: 1,
    },
    logging: {
      level: 'info',
      structured: true,
    },
    ...overrides,
  };
}

describe('TestContextFactory', () => {
  let factory: TestContextFactory;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Use placeholder driver to avoid real browser initialization
    factory = new TestContextFactory(createTestConfig(), { usePlaceholderDriver: true });
    // Suppress console output during tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('create()', () => {
    it('should create a TestContext with unique id', async () => {
      const context = await factory.create('worker-1');

      expect(context.id).toMatch(/^ctx-worker-1-\d+$/);
    });

    it('should create a TestContext with the provided workerId', async () => {
      const context = await factory.create('worker-42');

      expect(context.workerId).toBe('worker-42');
    });

    it('should create a TestContext with unique correlationId', async () => {
      const context = await factory.create('worker-1');

      expect(context.correlationId).toMatch(/^corr-worker-1-\d+-[a-z0-9]+$/);
    });

    it('should create a TestContext with frozen config', async () => {
      const context = await factory.create('worker-1');

      expect(Object.isFrozen(context.config)).toBe(true);
    });

    it('should create a TestContext with all required properties', async () => {
      const context = await factory.create('worker-1');

      expect(context).toHaveProperty('id');
      expect(context).toHaveProperty('workerId');
      expect(context).toHaveProperty('driver');
      expect(context).toHaveProperty('config');
      expect(context).toHaveProperty('logger');
      expect(context).toHaveProperty('actions');
      expect(context).toHaveProperty('wait');
      expect(context).toHaveProperty('locators');
      expect(context).toHaveProperty('plugins');
      expect(context).toHaveProperty('correlationId');
    });

    it('should create a frozen TestContext object', async () => {
      const context = await factory.create('worker-1');

      expect(Object.isFrozen(context)).toBe(true);
    });
  });

  describe('context isolation', () => {
    it('should create contexts with different ids for different workers', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.id).not.toBe(context2.id);
    });

    it('should create contexts with different correlationIds for different workers', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.correlationId).not.toBe(context2.correlationId);
    });

    it('should create contexts with different ids for same worker called twice', async () => {
      const context1 = await factory.create('worker-1');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const context2 = await factory.create('worker-1');

      expect(context1.id).not.toBe(context2.id);
    });

    it('should create contexts with independent driver instances', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.driver).not.toBe(context2.driver);
    });

    it('should create contexts with independent logger instances', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.logger).not.toBe(context2.logger);
    });

    it('should create contexts with independent action helper instances', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.actions).not.toBe(context2.actions);
    });

    it('should create contexts with independent wait strategy instances', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.wait).not.toBe(context2.wait);
    });

    it('should create contexts with independent plugin manager instances', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      expect(context1.plugins).not.toBe(context2.plugins);
    });
  });

  describe('dispose()', () => {
    it('should dispose context without throwing', async () => {
      const context = await factory.create('worker-1');

      await expect(factory.dispose(context)).resolves.not.toThrow();
    });

    it('should call plugins.flushAll() during disposal', async () => {
      const context = await factory.create('worker-1');
      const flushSpy = vi.spyOn(context.plugins, 'flushAll');

      await factory.dispose(context);

      expect(flushSpy).toHaveBeenCalled();
    });

    it('should call driver.quit() during disposal', async () => {
      const context = await factory.create('worker-1');
      const quitSpy = vi.spyOn(context.driver, 'quit');

      await factory.dispose(context);

      expect(quitSpy).toHaveBeenCalled();
    });

    it('should handle plugin flush errors gracefully', async () => {
      const context = await factory.create('worker-1');
      vi.spyOn(context.plugins, 'flushAll').mockRejectedValue(new Error('Flush failed'));

      // Should not throw
      await expect(factory.dispose(context)).resolves.not.toThrow();
    });

    it('should handle driver quit errors gracefully', async () => {
      const context = await factory.create('worker-1');
      vi.spyOn(context.driver, 'quit').mockRejectedValue(new Error('Quit failed'));

      // Should not throw
      await expect(factory.dispose(context)).resolves.not.toThrow();
    });
  });

  describe('configuration handling', () => {
    it('should use default log level when not specified', async () => {
      const configWithoutLogging = createTestConfig();
      delete (configWithoutLogging as Record<string, unknown>).logging;
      const factoryWithoutLogging = new TestContextFactory(configWithoutLogging, { usePlaceholderDriver: true });

      const context = await factoryWithoutLogging.create('worker-1');

      // Logger should be created without errors
      expect(context.logger).toBeDefined();
    });

    it('should use configured log level', async () => {
      const configWithDebug = createTestConfig({
        logging: { level: 'debug', structured: true },
      });
      const factoryWithDebug = new TestContextFactory(configWithDebug, { usePlaceholderDriver: true });

      const context = await factoryWithDebug.create('worker-1');

      expect(context.config.logging?.level).toBe('debug');
    });

    it('should handle empty plugins configuration', async () => {
      const configWithoutPlugins = createTestConfig();
      delete (configWithoutPlugins as Record<string, unknown>).plugins;
      const factoryWithoutPlugins = new TestContextFactory(configWithoutPlugins, { usePlaceholderDriver: true });

      const context = await factoryWithoutPlugins.create('worker-1');

      expect(context.plugins).toBeDefined();
    });

    it('should handle plugins with enabled list', async () => {
      const configWithPlugins = createTestConfig({
        plugins: {
          enabled: ['metrics', 'allure'],
        },
      });
      const factoryWithPlugins = new TestContextFactory(configWithPlugins, { usePlaceholderDriver: true });

      const context = await factoryWithPlugins.create('worker-1');

      expect(context.plugins).toBeDefined();
    });
  });

  describe('locators access', () => {
    it('should provide access to typed locators', async () => {
      const context = await factory.create('worker-1');

      expect(context.locators).toBeDefined();
      expect(context.locators.authentication).toBeDefined();
      expect(context.locators.dashboard).toBeDefined();
    });

    it('should provide access to specific locator elements', async () => {
      const context = await factory.create('worker-1');

      expect(context.locators.authentication.loginForm.usernameInput).toBeDefined();
      expect(context.locators.authentication.loginForm.usernameInput.selector).toBe(
        "[data-testid='username-input']"
      );
    });
  });
});

describe('TestContext immutability', () => {
  let factory: TestContextFactory;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    factory = new TestContextFactory(createTestConfig(), { usePlaceholderDriver: true });
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should not allow modification of context properties', async () => {
    const context = await factory.create('worker-1');

    expect(() => {
      (context as Record<string, unknown>).id = 'modified-id';
    }).toThrow();
  });

  it('should not allow adding new properties to context', async () => {
    const context = await factory.create('worker-1');

    expect(() => {
      (context as Record<string, unknown>).newProperty = 'value';
    }).toThrow();
  });

  it('should not allow deleting properties from context', async () => {
    const context = await factory.create('worker-1');

    expect(() => {
      delete (context as Record<string, unknown>).id;
    }).toThrow();
  });
});
