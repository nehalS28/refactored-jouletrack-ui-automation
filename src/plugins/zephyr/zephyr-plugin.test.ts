/**
 * Unit tests for ZephyrPlugin implementation.
 * Uses mocked HTTP client for test isolation.
 * 
 * @module plugins/zephyr/zephyr-plugin.test
 * @requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZephyrPlugin, type ZephyrPluginConfig, type HttpClient } from './zephyr-plugin.js';
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

function createMockHttpClient(): HttpClient & { post: ReturnType<typeof vi.fn> } {
  return {
    post: vi.fn().mockResolvedValue({ status: 200, data: { success: true } }),
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

describe('ZephyrPlugin', () => {
  let plugin: ZephyrPlugin;
  let logger: StructuredLogger;
  let httpClient: HttpClient & { post: ReturnType<typeof vi.fn> };
  const testConfig: Partial<ZephyrPluginConfig> = {
    enabled: true,
    baseUrl: 'https://zephyr.example.com',
    apiToken: 'test-api-token',
    projectKey: 'TEST',
    batchSize: 5,
    flushIntervalMs: 0, // Disable periodic flush for tests
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = createMockLogger();
    httpClient = createMockHttpClient();
    plugin = new ZephyrPlugin(testConfig, logger, httpClient);
    await plugin.initialize();
  });

  afterEach(async () => {
    await plugin.dispose();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      expect(plugin.name).toBe('zephyr');
      expect(plugin.version).toBe('1.0.0');
      expect(logger.info).toHaveBeenCalledWith('Zephyr plugin initialized', expect.any(Object));
    });

    it('should warn when plugin is disabled', async () => {
      const disabledPlugin = new ZephyrPlugin({ enabled: false }, logger, httpClient);
      await disabledPlugin.initialize();
      expect(logger.info).toHaveBeenCalledWith('Zephyr plugin disabled');
      await disabledPlugin.dispose();
    });

    it('should warn when config is incomplete', async () => {
      const incompletePlugin = new ZephyrPlugin({ enabled: true }, logger, httpClient);
      await incompletePlugin.initialize();
      expect(logger.warn).toHaveBeenCalledWith('Zephyr plugin not configured properly', expect.any(Object));
      await incompletePlugin.dispose();
    });

    it('should use default config when not provided', async () => {
      const defaultPlugin = new ZephyrPlugin(undefined, logger, httpClient);
      await defaultPlugin.initialize();
      expect(defaultPlugin.name).toBe('zephyr');
      await defaultPlugin.dispose();
    });
  });

  describe('tag parsing for test case mapping', () => {
    it('should extract test case key from @ZEPHYR-TC-123 format', async () => {
      await plugin.onTestStart('test-1', 'Login test @ZEPHYR-TC-123');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('Zephyr test case mapped', {
        testId: 'test-1',
        testName: 'Login test @ZEPHYR-TC-123',
        testCaseKey: 'TC-123',
      });
    });

    it('should extract test case key from @TC-456 format', async () => {
      await plugin.onTestStart('test-2', 'Dashboard test @TC-456');
      await plugin.onTestEnd('test-2', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('Zephyr test case mapped', {
        testId: 'test-2',
        testName: 'Dashboard test @TC-456',
        testCaseKey: 'TC-456',
      });
    });

    it('should extract test case key from @ZEPHYR:TC-789 format', async () => {
      await plugin.onTestStart('test-3', 'Settings test @ZEPHYR:TC-789');
      await plugin.onTestEnd('test-3', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('Zephyr test case mapped', {
        testId: 'test-3',
        testName: 'Settings test @ZEPHYR:TC-789',
        testCaseKey: 'TC-789',
      });
    });

    it('should extract test case key from [TC-101] format', async () => {
      await plugin.onTestStart('test-4', 'Report test [TC-101]');
      await plugin.onTestEnd('test-4', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('Zephyr test case mapped', {
        testId: 'test-4',
        testName: 'Report test [TC-101]',
        testCaseKey: 'TC-101',
      });
    });

    it('should extract test case key from [ZEPHYR-TC-202] format', async () => {
      await plugin.onTestStart('test-5', 'User test [ZEPHYR-TC-202]');
      await plugin.onTestEnd('test-5', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('Zephyr test case mapped', {
        testId: 'test-5',
        testName: 'User test [ZEPHYR-TC-202]',
        testCaseKey: 'TC-202',
      });
    });

    it('should handle case-insensitive tag matching', async () => {
      await plugin.onTestStart('test-6', 'Test @zephyr-tc-303');
      await plugin.onTestEnd('test-6', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('Zephyr test case mapped', {
        testId: 'test-6',
        testName: 'Test @zephyr-tc-303',
        testCaseKey: 'TC-303',
      });
    });

    it('should log when no test case tag is found', async () => {
      await plugin.onTestStart('test-7', 'Test without Zephyr tag');
      await plugin.onTestEnd('test-7', 'passed', 1000);
      
      expect(logger.debug).toHaveBeenCalledWith('No Zephyr test case tag found', {
        testId: 'test-7',
        testName: 'Test without Zephyr tag',
      });
    });

    it('should not queue execution when no test case key', async () => {
      await plugin.onTestStart('test-8', 'Test without tag');
      await plugin.onTestEnd('test-8', 'passed', 1000);
      
      expect(plugin.getPendingCount()).toBe(0);
    });
  });

  describe('status mapping', () => {
    it('should map passed status to Pass', async () => {
      await plugin.onTestStart('test-pass', 'Test @TC-100');
      await plugin.onTestEnd('test-pass', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ status: 'Pass' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should map failed status to Fail', async () => {
      await plugin.onTestStart('test-fail', 'Test @TC-101');
      await plugin.onTestEnd('test-fail', 'failed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ status: 'Fail' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should map skipped status to Not Executed', async () => {
      await plugin.onTestStart('test-skip', 'Test @TC-102');
      await plugin.onTestEnd('test-skip', 'skipped', 0);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ status: 'Not Executed' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should map pending status to Blocked', async () => {
      await plugin.onTestStart('test-pending', 'Test @TC-103');
      await plugin.onTestEnd('test-pending', 'pending', 0);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ status: 'Blocked' }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('batch updates', () => {
    it('should queue executions until batch size is reached', async () => {
      // Add 4 tests (batch size is 5)
      for (let i = 1; i <= 4; i++) {
        await plugin.onTestStart(`test-${i}`, `Test @TC-${i}`);
        await plugin.onTestEnd(`test-${i}`, 'passed', 1000);
      }
      
      expect(plugin.getPendingCount()).toBe(4);
      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('should auto-flush when batch size is reached', async () => {
      // Add 5 tests (batch size is 5)
      for (let i = 1; i <= 5; i++) {
        await plugin.onTestStart(`test-${i}`, `Test @TC-${i}`);
        await plugin.onTestEnd(`test-${i}`, 'passed', 1000);
      }
      
      expect(httpClient.post).toHaveBeenCalledTimes(1);
      expect(plugin.getPendingCount()).toBe(0);
    });

    it('should send all pending executions in batch', async () => {
      await plugin.onTestStart('test-1', 'Test 1 @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      await plugin.onTestStart('test-2', 'Test 2 @TC-2');
      await plugin.onTestEnd('test-2', 'failed', 2000);
      await plugin.onTestStart('test-3', 'Test 3 @TC-3');
      await plugin.onTestEnd('test-3', 'skipped', 0);
      
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ testCaseKey: 'TC-1', status: 'Pass' }),
            expect.objectContaining({ testCaseKey: 'TC-2', status: 'Fail' }),
            expect.objectContaining({ testCaseKey: 'TC-3', status: 'Not Executed' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should clear queue after successful flush', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      
      expect(plugin.getPendingCount()).toBe(1);
      await plugin.flush();
      expect(plugin.getPendingCount()).toBe(0);
    });

    it('should not call API when queue is empty', async () => {
      await plugin.flush();
      expect(httpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should continue test execution when Zephyr sync fails', async () => {
      httpClient.post.mockRejectedValueOnce(new Error('Network error'));
      
      await plugin.onTestStart('test-1', 'Test @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      await plugin.flush();
      
      expect(logger.warn).toHaveBeenCalledWith('Zephyr sync failed, continuing test execution', expect.any(Object));
      expect(plugin.getPendingCount()).toBe(0); // Queue should be cleared
    });

    it('should log warning when API returns error status', async () => {
      httpClient.post.mockResolvedValueOnce({ status: 500, data: { error: 'Server error' } });
      
      await plugin.onTestStart('test-1', 'Test @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      await plugin.flush();
      
      expect(logger.warn).toHaveBeenCalledWith('Zephyr sync failed, continuing test execution', expect.any(Object));
    });

    it('should warn when no current test on onTestEnd', async () => {
      await plugin.onTestEnd('orphan-test', 'passed', 1000);
      expect(logger.warn).toHaveBeenCalledWith('No current Zephyr test execution', {
        testId: 'orphan-test',
      });
    });

    it('should include error message in execution comment', async () => {
      await plugin.onTestStart('test-error', 'Test @TC-1');
      const error = new Error('Element not found');
      await plugin.onError(error, createMockErrorContext({ testId: 'test-error' }));
      await plugin.onTestEnd('test-error', 'failed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({
              testCaseKey: 'TC-1',
              status: 'Fail',
              comment: 'Element not found',
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('API integration', () => {
    it('should send correct API request format', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-123');
      await plugin.onTestEnd('test-1', 'passed', 1500);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        'https://zephyr.example.com/rest/api/2/testexecutions',
        {
          projectKey: 'TEST',
          cycleId: undefined,
          folderId: undefined,
          executions: [
            {
              testCaseKey: 'TC-123',
              status: 'Pass',
              executionTime: 1500,
              comment: undefined,
            },
          ],
        },
        {
          'Authorization': 'Bearer test-api-token',
        }
      );
    });

    it('should include cycleId and folderId when configured', async () => {
      const configWithCycle: Partial<ZephyrPluginConfig> = {
        ...testConfig,
        cycleId: 'cycle-123',
        folderId: 'folder-456',
      };
      const pluginWithCycle = new ZephyrPlugin(configWithCycle, logger, httpClient);
      await pluginWithCycle.initialize();
      
      await pluginWithCycle.onTestStart('test-1', 'Test @TC-1');
      await pluginWithCycle.onTestEnd('test-1', 'passed', 1000);
      await pluginWithCycle.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cycleId: 'cycle-123',
          folderId: 'folder-456',
        }),
        expect.any(Object)
      );
      
      await pluginWithCycle.dispose();
    });

    it('should include execution time in milliseconds', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 2500);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ executionTime: 2500 }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('setTestCaseKey', () => {
    it('should allow programmatic test case key setting', async () => {
      await plugin.onTestStart('test-1', 'Test without tag');
      plugin.setTestCaseKey('TC-999');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ testCaseKey: 'TC-999' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should override tag-based test case key', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-100');
      plugin.setTestCaseKey('TC-200');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ testCaseKey: 'TC-200' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should not set key when no test is active', () => {
      plugin.setTestCaseKey('TC-999');
      // Should not throw
      expect(logger.debug).not.toHaveBeenCalledWith('Zephyr test case key set', expect.any(Object));
    });
  });

  describe('onStepExecuted', () => {
    it('should log step execution but not track in Zephyr', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-1');
      const step = createMockStepInfo();
      await plugin.onStepExecuted(step);
      
      expect(logger.debug).toHaveBeenCalledWith('Step executed (not tracked in Zephyr)', {
        stepId: 'step-123',
        status: 'passed',
      });
    });
  });

  describe('flush', () => {
    it('should flush remaining executions on dispose', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      
      expect(plugin.getPendingCount()).toBe(1);
      await plugin.dispose();
      
      expect(httpClient.post).toHaveBeenCalled();
    });

    it('should skip flush when plugin is not configured', async () => {
      const unconfiguredPlugin = new ZephyrPlugin({ enabled: true }, logger, httpClient);
      await unconfiguredPlugin.initialize();
      
      await unconfiguredPlugin.onTestStart('test-1', 'Test @TC-1');
      await unconfiguredPlugin.onTestEnd('test-1', 'passed', 1000);
      await unconfiguredPlugin.flush();
      
      expect(httpClient.post).not.toHaveBeenCalled();
      await unconfiguredPlugin.dispose();
    });

    it('should log success after flush', async () => {
      await plugin.onTestStart('test-1', 'Test @TC-1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      await plugin.flush();
      
      expect(logger.info).toHaveBeenCalledWith('Zephyr executions synced', { count: 1 });
    });
  });

  describe('dispose', () => {
    it('should dispose plugin and log', async () => {
      await plugin.dispose();
      expect(logger.info).toHaveBeenCalledWith('Zephyr plugin disposed');
    });

    it('should handle multiple dispose calls gracefully', async () => {
      await plugin.dispose();
      await plugin.dispose();
      // Should not throw
    });
  });

  describe('complete test lifecycle', () => {
    it('should handle complete test lifecycle with multiple tests', async () => {
      // Test 1 - passed
      await plugin.onTestStart('test-1', 'Login test @TC-100');
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-1', text: 'Enter credentials' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-2', text: 'Click submit' }));
      await plugin.onTestEnd('test-1', 'passed', 2000);
      
      // Test 2 - failed with error
      await plugin.onTestStart('test-2', 'Dashboard test @TC-101');
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-3', text: 'Navigate to dashboard' }));
      await plugin.onError(new Error('Dashboard not loaded'), createMockErrorContext({ testId: 'test-2' }));
      await plugin.onTestEnd('test-2', 'failed', 3000);
      
      // Test 3 - skipped
      await plugin.onTestStart('test-3', 'Settings test @TC-102');
      await plugin.onTestEnd('test-3', 'skipped', 0);
      
      // Test 4 - no Zephyr tag
      await plugin.onTestStart('test-4', 'Untagged test');
      await plugin.onTestEnd('test-4', 'passed', 1000);
      
      await plugin.flush();
      
      // Should only send 3 executions (test-4 has no tag)
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ testCaseKey: 'TC-100', status: 'Pass', executionTime: 2000 }),
            expect.objectContaining({ testCaseKey: 'TC-101', status: 'Fail', comment: 'Dashboard not loaded' }),
            expect.objectContaining({ testCaseKey: 'TC-102', status: 'Not Executed' }),
          ]),
        }),
        expect.any(Object)
      );
      
      const callArgs = httpClient.post.mock.calls[0][1] as { executions: unknown[] };
      expect(callArgs.executions).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle very long test names', async () => {
      const longName = 'A'.repeat(500) + ' @TC-123';
      await plugin.onTestStart('test-long', longName);
      await plugin.onTestEnd('test-long', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalled();
    });

    it('should handle special characters in test names', async () => {
      const specialName = 'Test with "quotes" & <special> chars @TC-123';
      await plugin.onTestStart('test-special', specialName);
      await plugin.onTestEnd('test-special', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalled();
    });

    it('should handle zero duration', async () => {
      await plugin.onTestStart('test-zero', 'Test @TC-123');
      await plugin.onTestEnd('test-zero', 'passed', 0);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ executionTime: 0 }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should handle multiple test case tags (use first match)', async () => {
      await plugin.onTestStart('test-multi', 'Test @TC-100 @TC-200');
      await plugin.onTestEnd('test-multi', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ testCaseKey: 'TC-100' }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should normalize test case key to uppercase', async () => {
      await plugin.onTestStart('test-lower', 'Test @tc-123');
      await plugin.onTestEnd('test-lower', 'passed', 1000);
      await plugin.flush();
      
      expect(httpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executions: expect.arrayContaining([
            expect.objectContaining({ testCaseKey: 'TC-123' }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });
});
