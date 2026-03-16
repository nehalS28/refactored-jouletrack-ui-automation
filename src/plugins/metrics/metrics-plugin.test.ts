/**
 * Unit tests for MetricsPlugin implementation.
 * Uses in-memory database for test isolation.
 * 
 * @module plugins/metrics/metrics-plugin.test
 * @requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsPlugin, type MetricsPluginConfig } from './metrics-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';
import type { StepInfo, ErrorContext } from '../plugin.types.js';

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


describe('MetricsPlugin', () => {
  let plugin: MetricsPlugin;
  let logger: StructuredLogger;
  const testConfig: Partial<MetricsPluginConfig> = {
    enabled: true,
    dbPath: ':memory:',
    slowLocatorThresholdMs: 500,
    performanceRegressionThreshold: 0.5,
  };

  beforeEach(async () => {
    logger = createMockLogger();
    plugin = new MetricsPlugin(testConfig, logger);
    await plugin.initialize();
  });

  afterEach(async () => {
    await plugin.dispose();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(plugin.name).toBe('metrics');
      expect(plugin.version).toBe('1.0.0');
      expect(logger.info).toHaveBeenCalledWith('Metrics plugin initialized', expect.any(Object));
    });

    it('should use default config when not provided', async () => {
      // Use in-memory database to avoid directory creation issues
      const defaultPlugin = new MetricsPlugin({ dbPath: ':memory:' }, logger);
      await defaultPlugin.initialize();
      expect(defaultPlugin.name).toBe('metrics');
      await defaultPlugin.dispose();
    });
  });

  describe('onTestStart', () => {
    it('should start tracking metrics for a test', async () => {
      await plugin.onTestStart('test-123', 'Login Test');
      expect(logger.debug).toHaveBeenCalledWith('Metrics tracking started for test', {
        testId: 'test-123',
        testName: 'Login Test',
      });
    });
  });

  describe('onTestEnd', () => {
    it('should save metrics when test ends', async () => {
      await plugin.onTestStart('test-end-1', 'Test End');
      await plugin.onTestEnd('test-end-1', 'passed', 1500);
      
      expect(logger.debug).toHaveBeenCalledWith('Metrics saved for test', {
        testId: 'test-end-1',
        status: 'passed',
        duration: 1500,
      });
    });

    it('should warn when no current test exists', async () => {
      await plugin.onTestEnd('orphan-test', 'passed', 1000);
      expect(logger.warn).toHaveBeenCalledWith('No current test metrics builder', {
        testId: 'orphan-test',
      });
    });

    it('should handle failed test status', async () => {
      await plugin.onTestStart('test-fail', 'Failing Test');
      await plugin.onTestEnd('test-fail', 'failed', 2000);
      
      expect(logger.debug).toHaveBeenCalledWith('Metrics saved for test', {
        testId: 'test-fail',
        status: 'failed',
        duration: 2000,
      });
    });
  });


  describe('onStepExecuted', () => {
    it('should log step execution', async () => {
      await plugin.onTestStart('test-step', 'Step Test');
      const step = createMockStepInfo();
      await plugin.onStepExecuted(step);
      
      expect(logger.debug).toHaveBeenCalledWith('Step executed', {
        stepId: 'step-123',
        status: 'passed',
        duration: 250,
      });
    });
  });

  describe('onError', () => {
    it('should log error in metrics', async () => {
      const error = new Error('Test error');
      const context = createMockErrorContext();
      await plugin.onError(error, context);
      
      expect(logger.debug).toHaveBeenCalledWith('Error recorded in metrics', {
        error: 'Test error',
        testId: 'test-123',
      });
    });
  });

  describe('recordLocatorLookup', () => {
    it('should record locator lookup metric', async () => {
      await plugin.onTestStart('test-locator', 'Locator Test');
      plugin.recordLocatorLookup('login.username', 50, true);
      
      // Metric is recorded internally, verify by completing test
      await plugin.onTestEnd('test-locator', 'passed', 1000);
      expect(logger.debug).toHaveBeenCalledWith('Metrics saved for test', expect.any(Object));
    });

    it('should flag slow locators exceeding threshold', async () => {
      await plugin.onTestStart('test-slow-locator', 'Slow Locator Test');
      plugin.recordLocatorLookup('slow.element', 600, true);
      
      expect(logger.warn).toHaveBeenCalledWith('Slow locator detected', {
        locator: 'slow.element',
        timeMs: 600,
        threshold: 500,
      });
    });

    it('should not flag locators under threshold', async () => {
      await plugin.onTestStart('test-fast-locator', 'Fast Locator Test');
      plugin.recordLocatorLookup('fast.element', 100, true);
      
      expect(logger.warn).not.toHaveBeenCalledWith('Slow locator detected', expect.any(Object));
    });

    it('should handle failed locator lookups', async () => {
      await plugin.onTestStart('test-failed-locator', 'Failed Locator Test');
      plugin.recordLocatorLookup('missing.element', 5000, false);
      
      // Should still record the metric
      await plugin.onTestEnd('test-failed-locator', 'failed', 5000);
    });

    it('should not record when no test is active', () => {
      plugin.recordLocatorLookup('orphan.locator', 100, true);
      // Should not throw, just silently ignore
    });
  });


  describe('recordWaitTime', () => {
    it('should record wait time metric', async () => {
      await plugin.onTestStart('test-wait', 'Wait Test');
      plugin.recordWaitTime('visible', 5000, 250, true);
      
      expect(logger.debug).toHaveBeenCalledWith('Wait recorded', {
        condition: 'visible',
        configuredMs: 5000,
        actualMs: 250,
        efficiency: '95.0%',
        success: true,
      });
    });

    it('should calculate wait efficiency correctly', async () => {
      await plugin.onTestStart('test-efficiency', 'Efficiency Test');
      plugin.recordWaitTime('clickable', 10000, 1000, true);
      
      expect(logger.debug).toHaveBeenCalledWith('Wait recorded', {
        condition: 'clickable',
        configuredMs: 10000,
        actualMs: 1000,
        efficiency: '90.0%',
        success: true,
      });
    });

    it('should handle zero configured timeout', async () => {
      await plugin.onTestStart('test-zero', 'Zero Timeout Test');
      plugin.recordWaitTime('present', 0, 100, true);
      
      expect(logger.debug).toHaveBeenCalledWith('Wait recorded', {
        condition: 'present',
        configuredMs: 0,
        actualMs: 100,
        efficiency: '0%',
        success: true,
      });
    });

    it('should not record when no test is active', () => {
      plugin.recordWaitTime('visible', 5000, 250, true);
      // Should not throw, just silently ignore
    });
  });

  describe('setWorkerId', () => {
    it('should set worker ID for current test', async () => {
      await plugin.onTestStart('test-worker', 'Worker Test');
      plugin.setWorkerId('worker-42');
      await plugin.onTestEnd('test-worker', 'passed', 1000);
      
      // Worker ID is stored internally with the metrics
      expect(logger.debug).toHaveBeenCalledWith('Metrics saved for test', expect.any(Object));
    });

    it('should not throw when no test is active', () => {
      plugin.setWorkerId('orphan-worker');
      // Should not throw
    });
  });


  describe('performance regression detection', () => {
    it('should detect performance regression when test is >50% slower', async () => {
      // First run establishes baseline
      await plugin.onTestStart('test-regression', 'Regression Test');
      await plugin.onTestEnd('test-regression', 'passed', 1000);
      await plugin.flush();
      
      // Second run is significantly slower
      await plugin.onTestStart('test-regression', 'Regression Test');
      await plugin.onTestEnd('test-regression', 'passed', 2000);
      
      expect(logger.warn).toHaveBeenCalledWith('Performance regression detected', expect.objectContaining({
        testId: 'test-regression',
        currentDuration: 2000,
      }));
    });

    it('should not flag regression when within threshold', async () => {
      // First run establishes baseline
      await plugin.onTestStart('test-ok', 'OK Test');
      await plugin.onTestEnd('test-ok', 'passed', 1000);
      await plugin.flush();
      
      // Clear mock to check for new warnings
      vi.clearAllMocks();
      
      // Second run is only slightly slower (40% - within 50% threshold)
      await plugin.onTestStart('test-ok', 'OK Test');
      await plugin.onTestEnd('test-ok', 'passed', 1400);
      
      expect(logger.warn).not.toHaveBeenCalledWith('Performance regression detected', expect.any(Object));
    });

    it('should not flag regression on first run', async () => {
      await plugin.onTestStart('test-first', 'First Run Test');
      await plugin.onTestEnd('test-first', 'passed', 5000);
      
      expect(logger.warn).not.toHaveBeenCalledWith('Performance regression detected', expect.any(Object));
    });
  });

  describe('getBaseline', () => {
    it('should return null for non-existent test', async () => {
      const baseline = await plugin.getBaseline('non-existent');
      expect(baseline).toBeNull();
    });

    it('should return baseline after test completion', async () => {
      await plugin.onTestStart('test-baseline', 'Baseline Test');
      await plugin.onTestEnd('test-baseline', 'passed', 1500);
      await plugin.flush();
      
      const baseline = await plugin.getBaseline('test-baseline');
      expect(baseline).toBe(1500);
    });
  });

  describe('flush', () => {
    it('should flush pending metrics', async () => {
      await plugin.onTestStart('test-flush', 'Flush Test');
      await plugin.onTestEnd('test-flush', 'passed', 1000);
      await plugin.flush();
      
      expect(logger.debug).toHaveBeenCalledWith('Metrics flushed');
    });
  });

  describe('dispose', () => {
    it('should dispose plugin and close database', async () => {
      await plugin.dispose();
      expect(logger.info).toHaveBeenCalledWith('Metrics plugin disposed');
    });
  });


  describe('complete test lifecycle', () => {
    it('should track complete test with all metrics', async () => {
      await plugin.onTestStart('test-complete', 'Complete Test');
      plugin.setWorkerId('worker-1');
      
      // Record locator lookups
      plugin.recordLocatorLookup('login.username', 50, true);
      plugin.recordLocatorLookup('login.password', 45, true);
      plugin.recordLocatorLookup('login.submit', 30, true);
      
      // Record wait times
      plugin.recordWaitTime('visible', 5000, 200, true);
      plugin.recordWaitTime('clickable', 5000, 150, true);
      
      // Execute steps
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-1', text: 'Enter username' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-2', text: 'Enter password' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-3', text: 'Click submit' }));
      
      // End test
      await plugin.onTestEnd('test-complete', 'passed', 2500);
      await plugin.flush();
      
      // Verify baseline was created
      const baseline = await plugin.getBaseline('test-complete');
      expect(baseline).toBe(2500);
    });

    it('should handle multiple sequential tests', async () => {
      // Test 1
      await plugin.onTestStart('test-seq-1', 'Sequential Test 1');
      plugin.recordLocatorLookup('element-1', 100, true);
      await plugin.onTestEnd('test-seq-1', 'passed', 1000);
      
      // Test 2
      await plugin.onTestStart('test-seq-2', 'Sequential Test 2');
      plugin.recordLocatorLookup('element-2', 150, true);
      await plugin.onTestEnd('test-seq-2', 'passed', 1500);
      
      // Test 3
      await plugin.onTestStart('test-seq-3', 'Sequential Test 3');
      plugin.recordLocatorLookup('element-3', 200, true);
      await plugin.onTestEnd('test-seq-3', 'failed', 2000);
      
      await plugin.flush();
      
      // Verify all baselines
      expect(await plugin.getBaseline('test-seq-1')).toBe(1000);
      expect(await plugin.getBaseline('test-seq-2')).toBe(1500);
      expect(await plugin.getBaseline('test-seq-3')).toBe(2000);
    });
  });

  describe('edge cases', () => {
    it('should handle very long test durations', async () => {
      await plugin.onTestStart('test-long', 'Long Test');
      await plugin.onTestEnd('test-long', 'passed', 3600000); // 1 hour
      await plugin.flush();
      
      const baseline = await plugin.getBaseline('test-long');
      expect(baseline).toBe(3600000);
    });

    it('should handle zero duration', async () => {
      await plugin.onTestStart('test-zero-duration', 'Zero Duration Test');
      await plugin.onTestEnd('test-zero-duration', 'passed', 0);
      await plugin.flush();
      
      const baseline = await plugin.getBaseline('test-zero-duration');
      expect(baseline).toBe(0);
    });

    it('should handle special characters in test names', async () => {
      const specialName = 'Test with "quotes" and \'apostrophes\' & <special> chars';
      await plugin.onTestStart('test-special', specialName);
      await plugin.onTestEnd('test-special', 'passed', 1000);
      await plugin.flush();
      
      const baseline = await plugin.getBaseline('test-special');
      expect(baseline).toBe(1000);
    });
  });
});
