/**
 * Unit tests for PluginManager implementation.
 * Tests plugin registration, event broadcasting, and error isolation.
 * 
 * @module plugins/plugin-manager.test
 * @requirements 14.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluginManagerImpl, createPluginManager } from './plugin-manager.js';
import type { Plugin, TestStatus, StepInfo, ErrorContext } from './plugin.types.js';
import type { StructuredLogger } from '../types/context.types.js';

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

function createMockPlugin(name: string, version = '1.0.0'): Plugin {
  return {
    name,
    version,
    initialize: vi.fn().mockResolvedValue(undefined),
    onTestStart: vi.fn().mockResolvedValue(undefined),
    onTestEnd: vi.fn().mockResolvedValue(undefined),
    onStepExecuted: vi.fn().mockResolvedValue(undefined),
    onError: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockStepInfo(overrides: Partial<StepInfo> = {}): StepInfo {
  return {
    id: 'step-123',
    text: 'Click login button',
    type: 'When',
    status: 'passed',
    duration: 250,
    ...overrides,
  };
}

function createMockErrorContext(overrides: Partial<ErrorContext> = {}): ErrorContext {
  return {
    testId: 'test-123',
    pageUrl: 'http://example.com',
    ...overrides,
  };
}



describe('PluginManagerImpl', () => {
  let logger: StructuredLogger;
  let pluginManager: PluginManagerImpl;

  beforeEach(() => {
    logger = createMockLogger();
    pluginManager = new PluginManagerImpl(logger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a plugin successfully', () => {
      const plugin = createMockPlugin('test-plugin');
      pluginManager.register(plugin);
      expect(pluginManager.size).toBe(1);
      expect(pluginManager.get('test-plugin')).toBe(plugin);
      expect(logger.debug).toHaveBeenCalledWith('Plugin registered', {
        pluginName: 'test-plugin',
        version: '1.0.0',
      });
    });

    it('should replace existing plugin with same name', () => {
      const plugin1 = createMockPlugin('test-plugin', '1.0.0');
      const plugin2 = createMockPlugin('test-plugin', '2.0.0');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      expect(pluginManager.size).toBe(1);
      expect(pluginManager.get('test-plugin')).toBe(plugin2);
      expect(logger.warn).toHaveBeenCalledWith('Plugin already registered, replacing', {
        pluginName: 'test-plugin',
      });
    });

    it('should register multiple plugins', () => {
      pluginManager.register(createMockPlugin('plugin-1'));
      pluginManager.register(createMockPlugin('plugin-2'));
      pluginManager.register(createMockPlugin('plugin-3'));
      expect(pluginManager.size).toBe(3);
      expect(pluginManager.getPluginNames()).toEqual(['plugin-1', 'plugin-2', 'plugin-3']);
    });
  });

  describe('get', () => {
    it('should return registered plugin by name', () => {
      const plugin = createMockPlugin('test-plugin');
      pluginManager.register(plugin);
      expect(pluginManager.get('test-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(pluginManager.get('non-existent')).toBeUndefined();
    });
  });

  describe('notifyTestStart', () => {
    it('should notify all plugins of test start', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.notifyTestStart('test-123', 'Test Name');
      expect(plugin1.onTestStart).toHaveBeenCalledWith('test-123', 'Test Name');
      expect(plugin2.onTestStart).toHaveBeenCalledWith('test-123', 'Test Name');
    });

    it('should handle empty plugin list', async () => {
      await expect(pluginManager.notifyTestStart('test-123', 'Test Name')).resolves.not.toThrow();
    });

    it('should isolate plugin errors', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      (plugin1.onTestStart as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Plugin 1 failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.notifyTestStart('test-123', 'Test Name');
      expect(plugin2.onTestStart).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Plugin onTestStart failed', {
        pluginName: 'plugin-1',
        action: 'onTestStart',
        error: 'Plugin 1 failed',
      });
    });
  });

  describe('notifyTestEnd', () => {
    it('should notify all plugins of test end', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.notifyTestEnd('test-123', 'passed', 1500);
      expect(plugin1.onTestEnd).toHaveBeenCalledWith('test-123', 'passed', 1500);
      expect(plugin2.onTestEnd).toHaveBeenCalledWith('test-123', 'passed', 1500);
    });

    it('should handle different test statuses', async () => {
      const plugin = createMockPlugin('test-plugin');
      pluginManager.register(plugin);
      const statuses: TestStatus[] = ['passed', 'failed', 'skipped', 'pending'];
      for (const status of statuses) {
        await pluginManager.notifyTestEnd('test-123', status, 1000);
        expect(plugin.onTestEnd).toHaveBeenCalledWith('test-123', status, 1000);
      }
    });

    it('should isolate plugin errors', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      (plugin1.onTestEnd as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Plugin 1 failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.notifyTestEnd('test-123', 'passed', 1500);
      expect(plugin2.onTestEnd).toHaveBeenCalled();
    });
  });

  describe('notifyStepExecuted', () => {
    it('should notify all plugins of step execution', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      const stepInfo = createMockStepInfo();
      await pluginManager.notifyStepExecuted(stepInfo);
      expect(plugin1.onStepExecuted).toHaveBeenCalledWith(stepInfo);
      expect(plugin2.onStepExecuted).toHaveBeenCalledWith(stepInfo);
    });

    it('should isolate plugin errors', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      (plugin1.onStepExecuted as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Step failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.notifyStepExecuted(createMockStepInfo());
      expect(plugin2.onStepExecuted).toHaveBeenCalled();
    });
  });

  describe('notifyError', () => {
    it('should notify all plugins of error', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      const error = new Error('Test error');
      const context = createMockErrorContext();
      await pluginManager.notifyError(error, context);
      expect(plugin1.onError).toHaveBeenCalledWith(error, context);
      expect(plugin2.onError).toHaveBeenCalledWith(error, context);
    });

    it('should isolate plugin errors', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      (plugin1.onError as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error handler failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.notifyError(new Error('Original error'), createMockErrorContext());
      expect(plugin2.onError).toHaveBeenCalled();
    });
  });

  describe('flushAll', () => {
    it('should flush all plugins', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.flushAll();
      expect(plugin1.flush).toHaveBeenCalled();
      expect(plugin2.flush).toHaveBeenCalled();
    });

    it('should isolate plugin errors during flush', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      (plugin1.flush as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Flush failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.flushAll();
      expect(plugin2.flush).toHaveBeenCalled();
    });
  });

  describe('disposeAll', () => {
    it('should dispose all plugins and clear registry', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.disposeAll();
      expect(plugin1.dispose).toHaveBeenCalled();
      expect(plugin2.dispose).toHaveBeenCalled();
      expect(pluginManager.size).toBe(0);
    });

    it('should isolate plugin errors during dispose', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      (plugin1.dispose as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dispose failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.disposeAll();
      expect(plugin2.dispose).toHaveBeenCalled();
      expect(pluginManager.size).toBe(0);
    });
  });

  describe('getPluginNames', () => {
    it('should return all registered plugin names', () => {
      pluginManager.register(createMockPlugin('alpha'));
      pluginManager.register(createMockPlugin('beta'));
      expect(pluginManager.getPluginNames()).toEqual(['alpha', 'beta']);
    });

    it('should return empty array when no plugins registered', () => {
      expect(pluginManager.getPluginNames()).toEqual([]);
    });
  });

  describe('error isolation', () => {
    it('should continue processing all plugins even when multiple fail', async () => {
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      const plugin3 = createMockPlugin('plugin-3');
      (plugin1.onTestStart as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Plugin 1 failed'));
      (plugin3.onTestStart as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Plugin 3 failed'));
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      pluginManager.register(plugin3);
      await pluginManager.notifyTestStart('test-123', 'Test Name');
      expect(plugin1.onTestStart).toHaveBeenCalled();
      expect(plugin2.onTestStart).toHaveBeenCalled();
      expect(plugin3.onTestStart).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('createPluginManager', () => {
  it('should create a new PluginManager instance', () => {
    const logger = createMockLogger();
    const manager = createPluginManager(logger);
    expect(manager).toBeInstanceOf(PluginManagerImpl);
    expect(manager.size).toBe(0);
  });
});
