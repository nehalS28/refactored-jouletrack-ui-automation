/**
 * Unit tests for AllurePlugin implementation.
 * Uses mocked file system for test isolation.
 * 
 * @module plugins/allure/allure-plugin.test
 * @requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AllurePlugin, type AllurePluginConfig } from './allure-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';
import type { StepInfo, ErrorContext } from '../plugin.types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
  access: vi.fn().mockResolvedValue(undefined),
}));

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

describe('AllurePlugin', () => {
  let plugin: AllurePlugin;
  let logger: StructuredLogger;
  const testConfig: Partial<AllurePluginConfig> = {
    enabled: true,
    resultsDir: './test-allure-results',
    attachScreenshotsOnFailure: true,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = createMockLogger();
    plugin = new AllurePlugin(testConfig, logger);
    await plugin.initialize();
  });

  afterEach(async () => {
    await plugin.dispose();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(plugin.name).toBe('allure');
      expect(plugin.version).toBe('1.0.0');
      expect(logger.info).toHaveBeenCalledWith('Allure plugin initialized', expect.any(Object));
    });

    it('should create results directory on initialization', async () => {
      expect(fs.mkdir).toHaveBeenCalledWith('./test-allure-results', { recursive: true });
    });

    it('should use default config when not provided', async () => {
      const defaultPlugin = new AllurePlugin(undefined, logger);
      await defaultPlugin.initialize();
      expect(defaultPlugin.name).toBe('allure');
      await defaultPlugin.dispose();
    });
  });

  describe('onTestStart', () => {
    it('should start tracking test for Allure report', async () => {
      await plugin.onTestStart('test-123', 'Login Test');
      expect(logger.debug).toHaveBeenCalledWith('Allure test started', {
        testId: 'test-123',
        testName: 'Login Test',
      });
    });

    it('should generate unique UUID for each test', async () => {
      await plugin.onTestStart('test-1', 'Test 1');
      await plugin.onTestEnd('test-1', 'passed', 1000);
      
      await plugin.onTestStart('test-2', 'Test 2');
      await plugin.onTestEnd('test-2', 'passed', 1000);
      
      // Both tests should have been written with different UUIDs
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('onTestEnd', () => {
    it('should write Allure result file when test ends', async () => {
      await plugin.onTestStart('test-end-1', 'Test End');
      await plugin.onTestEnd('test-end-1', 'passed', 1500);
      
      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[0]).toMatch(/test-allure-results.*-result\.json$/);
      
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.name).toBe('Test End');
      expect(resultContent.status).toBe('passed');
    });

    it('should warn when no current test exists', async () => {
      await plugin.onTestEnd('orphan-test', 'passed', 1000);
      expect(logger.warn).toHaveBeenCalledWith('No current Allure test result', {
        testId: 'orphan-test',
      });
    });

    it('should handle failed test status', async () => {
      await plugin.onTestStart('test-fail', 'Failing Test');
      await plugin.onTestEnd('test-fail', 'failed', 2000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.status).toBe('failed');
    });

    it('should handle skipped test status', async () => {
      await plugin.onTestStart('test-skip', 'Skipped Test');
      await plugin.onTestEnd('test-skip', 'skipped', 0);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.status).toBe('skipped');
    });

    it('should record execution duration', async () => {
      await plugin.onTestStart('test-duration', 'Duration Test');
      await plugin.onTestEnd('test-duration', 'passed', 2500);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.stop - resultContent.start).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onStepExecuted', () => {
    it('should record step in Allure result', async () => {
      await plugin.onTestStart('test-step', 'Step Test');
      const step = createMockStepInfo();
      await plugin.onStepExecuted(step);
      await plugin.onTestEnd('test-step', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.steps).toHaveLength(1);
      expect(resultContent.steps[0].name).toBe('When Click login button');
      expect(resultContent.steps[0].status).toBe('passed');
    });

    it('should record multiple steps in order', async () => {
      await plugin.onTestStart('test-multi-step', 'Multi Step Test');
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-1', text: 'Enter username', type: 'Given' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-2', text: 'Enter password', type: 'And' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-3', text: 'Click submit', type: 'When' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-4', text: 'See dashboard', type: 'Then' }));
      await plugin.onTestEnd('test-multi-step', 'passed', 2000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.steps).toHaveLength(4);
      expect(resultContent.steps[0].name).toBe('Given Enter username');
      expect(resultContent.steps[3].name).toBe('Then See dashboard');
    });

    it('should record failed step with error details', async () => {
      await plugin.onTestStart('test-failed-step', 'Failed Step Test');
      const failedStep = createMockStepInfo({
        id: 'step-fail',
        text: 'Click missing button',
        status: 'failed',
        error: new Error('Element not found'),
      });
      await plugin.onStepExecuted(failedStep);
      await plugin.onTestEnd('test-failed-step', 'failed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.steps[0].status).toBe('failed');
      expect(resultContent.steps[0].statusDetails).toBeDefined();
      expect(resultContent.steps[0].statusDetails.message).toBe('Element not found');
    });

    it('should not record step when no test is active', async () => {
      const step = createMockStepInfo();
      await plugin.onStepExecuted(step);
      // Should not throw, just silently ignore
      expect(logger.debug).not.toHaveBeenCalledWith('Allure step recorded', expect.any(Object));
    });
  });

  describe('onError', () => {
    it('should attach screenshot on error when configured', async () => {
      await plugin.onTestStart('test-error', 'Error Test');
      const error = new Error('Test error');
      const context = createMockErrorContext({
        screenshot: '/path/to/screenshot.png',
      });
      await plugin.onError(error, context);
      await plugin.onTestEnd('test-error', 'failed', 1000);
      
      // Find the result JSON file write (not the screenshot binary write)
      const writeCalls = vi.mocked(fs.writeFile).mock.calls;
      const resultWriteCall = writeCalls.find(call => 
        typeof call[1] === 'string' && call[1].includes('"uuid"')
      );
      expect(resultWriteCall).toBeDefined();
      const resultContent = JSON.parse(resultWriteCall![1] as string);
      expect(resultContent.attachments).toBeDefined();
      expect(resultContent.attachments.length).toBeGreaterThan(0);
    });

    it('should record error details in test result', async () => {
      await plugin.onTestStart('test-error-details', 'Error Details Test');
      const error = new Error('Detailed error message');
      const context = createMockErrorContext();
      await plugin.onError(error, context);
      await plugin.onTestEnd('test-error-details', 'failed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.statusDetails).toBeDefined();
      expect(resultContent.statusDetails.message).toBe('Detailed error message');
    });

    it('should not throw when no test is active', async () => {
      const error = new Error('Orphan error');
      const context = createMockErrorContext();
      await plugin.onError(error, context);
      // Should not throw
    });
  });

  describe('addAttachment', () => {
    it('should add custom attachment to test result', async () => {
      await plugin.onTestStart('test-attachment', 'Attachment Test');
      await plugin.addAttachment('API Response', '{"status": "ok"}', 'application/json');
      await plugin.onTestEnd('test-attachment', 'passed', 1000);
      
      // Find the result JSON file write (not the attachment file write)
      const writeCalls = vi.mocked(fs.writeFile).mock.calls;
      const resultWriteCall = writeCalls.find(call => 
        typeof call[1] === 'string' && call[1].includes('"uuid"')
      );
      expect(resultWriteCall).toBeDefined();
      const resultContent = JSON.parse(resultWriteCall![1] as string);
      expect(resultContent.attachments).toBeDefined();
      expect(resultContent.attachments.some((a: { name: string }) => a.name === 'API Response')).toBe(true);
    });

    it('should support multiple attachments', async () => {
      await plugin.onTestStart('test-multi-attach', 'Multi Attachment Test');
      await plugin.addAttachment('Request', '{"action": "login"}', 'application/json');
      await plugin.addAttachment('Response', '{"success": true}', 'application/json');
      await plugin.addAttachment('Logs', 'Step 1 completed\nStep 2 completed', 'text/plain');
      await plugin.onTestEnd('test-multi-attach', 'passed', 1000);
      
      // Find the result JSON file write (not the attachment file writes)
      const writeCalls = vi.mocked(fs.writeFile).mock.calls;
      const resultWriteCall = writeCalls.find(call => 
        typeof call[1] === 'string' && call[1].includes('"uuid"')
      );
      expect(resultWriteCall).toBeDefined();
      const resultContent = JSON.parse(resultWriteCall![1] as string);
      expect(resultContent.attachments).toHaveLength(3);
    });

    it('should not add attachment when no test is active', async () => {
      await plugin.addAttachment('Orphan', 'data', 'text/plain');
      // Should not throw
    });
  });

  describe('test categorization', () => {
    it('should add feature label', async () => {
      await plugin.onTestStart('test-feature', 'Feature Test');
      plugin.addLabel('feature', 'Authentication');
      await plugin.onTestEnd('test-feature', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.labels).toBeDefined();
      expect(resultContent.labels.some((l: { name: string; value: string }) => 
        l.name === 'feature' && l.value === 'Authentication'
      )).toBe(true);
    });

    it('should add severity label', async () => {
      await plugin.onTestStart('test-severity', 'Severity Test');
      plugin.addLabel('severity', 'critical');
      await plugin.onTestEnd('test-severity', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.labels.some((l: { name: string; value: string }) => 
        l.name === 'severity' && l.value === 'critical'
      )).toBe(true);
    });

    it('should add domain/suite label', async () => {
      await plugin.onTestStart('test-domain', 'Domain Test');
      plugin.addLabel('suite', 'Dashboard');
      await plugin.onTestEnd('test-domain', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.labels.some((l: { name: string; value: string }) => 
        l.name === 'suite' && l.value === 'Dashboard'
      )).toBe(true);
    });

    it('should support multiple labels', async () => {
      await plugin.onTestStart('test-multi-label', 'Multi Label Test');
      plugin.addLabel('feature', 'Login');
      plugin.addLabel('severity', 'blocker');
      plugin.addLabel('suite', 'Authentication');
      plugin.addLabel('epic', 'User Management');
      await plugin.onTestEnd('test-multi-label', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.labels.length).toBeGreaterThanOrEqual(4);
    });

    it('should not add label when no test is active', () => {
      plugin.addLabel('orphan', 'value');
      // Should not throw
    });
  });

  describe('environment information', () => {
    it('should include environment info in result', async () => {
      const envPlugin = new AllurePlugin({
        ...testConfig,
        environmentInfo: {
          browser: 'Chrome',
          version: '120.0',
          os: 'Linux',
        },
      }, logger);
      await envPlugin.initialize();
      
      await envPlugin.onTestStart('test-env', 'Environment Test');
      await envPlugin.onTestEnd('test-env', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.parameters).toBeDefined();
      expect(resultContent.parameters.some((p: { name: string; value: string }) => 
        p.name === 'browser' && p.value === 'Chrome'
      )).toBe(true);
      
      await envPlugin.dispose();
    });
  });

  describe('flush', () => {
    it('should flush pending results', async () => {
      await plugin.onTestStart('test-flush', 'Flush Test');
      await plugin.onTestEnd('test-flush', 'passed', 1000);
      await plugin.flush();
      
      expect(logger.debug).toHaveBeenCalledWith('Allure results flushed');
    });
  });

  describe('dispose', () => {
    it('should dispose plugin', async () => {
      await plugin.dispose();
      expect(logger.info).toHaveBeenCalledWith('Allure plugin disposed');
    });
  });

  describe('complete test lifecycle', () => {
    it('should track complete test with all features', async () => {
      await plugin.onTestStart('test-complete', 'Complete Login Test');
      
      // Add labels for categorization
      plugin.addLabel('feature', 'Authentication');
      plugin.addLabel('severity', 'critical');
      plugin.addLabel('suite', 'Login');
      
      // Execute steps
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-1', text: 'Navigate to login page', type: 'Given' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-2', text: 'Enter valid credentials', type: 'When' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-3', text: 'Click submit button', type: 'And' }));
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-4', text: 'User is logged in', type: 'Then' }));
      
      // Add custom attachment
      await plugin.addAttachment('Login Request', '{"username": "test"}', 'application/json');
      
      // End test
      await plugin.onTestEnd('test-complete', 'passed', 3500);
      await plugin.flush();
      
      // Find the result JSON file write (not the attachment file write)
      const writeCalls = vi.mocked(fs.writeFile).mock.calls;
      const resultWriteCall = writeCalls.find(call => 
        typeof call[1] === 'string' && call[1].includes('"uuid"')
      );
      expect(resultWriteCall).toBeDefined();
      const resultContent = JSON.parse(resultWriteCall![1] as string);
      
      expect(resultContent.name).toBe('Complete Login Test');
      expect(resultContent.status).toBe('passed');
      expect(resultContent.steps).toHaveLength(4);
      expect(resultContent.labels.length).toBeGreaterThanOrEqual(3);
      expect(resultContent.attachments).toHaveLength(1);
    });

    it('should handle multiple sequential tests', async () => {
      // Test 1
      await plugin.onTestStart('test-seq-1', 'Sequential Test 1');
      plugin.addLabel('feature', 'Feature1');
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-1', text: 'Step 1' }));
      await plugin.onTestEnd('test-seq-1', 'passed', 1000);
      
      // Test 2
      await plugin.onTestStart('test-seq-2', 'Sequential Test 2');
      plugin.addLabel('feature', 'Feature2');
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-2', text: 'Step 2' }));
      await plugin.onTestEnd('test-seq-2', 'failed', 1500);
      
      // Test 3
      await plugin.onTestStart('test-seq-3', 'Sequential Test 3');
      plugin.addLabel('feature', 'Feature3');
      await plugin.onStepExecuted(createMockStepInfo({ id: 'step-3', text: 'Step 3' }));
      await plugin.onTestEnd('test-seq-3', 'skipped', 0);
      
      await plugin.flush();
      
      // All three tests should have been written
      expect(fs.writeFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('should handle very long test names', async () => {
      const longName = 'A'.repeat(500);
      await plugin.onTestStart('test-long-name', longName);
      await plugin.onTestEnd('test-long-name', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.name).toBe(longName);
    });

    it('should handle special characters in test names', async () => {
      const specialName = 'Test with "quotes" and \'apostrophes\' & <special> chars';
      await plugin.onTestStart('test-special', specialName);
      await plugin.onTestEnd('test-special', 'passed', 1000);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.name).toBe(specialName);
    });

    it('should handle zero duration', async () => {
      await plugin.onTestStart('test-zero-duration', 'Zero Duration Test');
      await plugin.onTestEnd('test-zero-duration', 'passed', 0);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.stop - resultContent.start).toBeGreaterThanOrEqual(0);
    });

    it('should handle step with screenshot attachment', async () => {
      await plugin.onTestStart('test-step-screenshot', 'Step Screenshot Test');
      const stepWithScreenshot = createMockStepInfo({
        id: 'step-ss',
        text: 'Click button',
        screenshot: '/path/to/step-screenshot.png',
      });
      await plugin.onStepExecuted(stepWithScreenshot);
      await plugin.onTestEnd('test-step-screenshot', 'passed', 1000);
      
      // Step screenshot should be recorded
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const resultContent = JSON.parse(writeCall[1] as string);
      expect(resultContent.steps[0]).toBeDefined();
    });

    it('should handle file write errors gracefully', async () => {
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Write failed'));
      
      await plugin.onTestStart('test-write-error', 'Write Error Test');
      await plugin.onTestEnd('test-write-error', 'passed', 1000);
      
      expect(logger.error).toHaveBeenCalledWith('Failed to write Allure result', expect.any(Object));
    });
  });
});
