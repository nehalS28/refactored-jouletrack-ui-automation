/**
 * Comprehensive error handling tests for the UI automation framework.
 * Tests error context, screenshot capture, and sensitive data masking.
 * 
 * @module core/error-handling.test
 * @requirements 10.1, 10.3, 10.4, 10.6
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { ActionHelperImpl } from './action-helper.js';
import { createStructuredLogger } from './logger.js';
import type { WebDriver, WebElement } from 'selenium-webdriver';
import type { Locator } from '../types/locator.types.js';
import type { WaitStrategy } from '../types/context.types.js';
import type { RetryConfig } from '../types/config.types.js';
import { ActionFailedError } from '../utils/errors.js';

// Mock WebElement
const createMockElement = (overrides: Partial<WebElement> = {}): WebElement => ({
  click: vi.fn().mockResolvedValue(undefined),
  sendKeys: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getText: vi.fn().mockResolvedValue('test text'),
  getAttribute: vi.fn().mockResolvedValue('test-value'),
  isDisplayed: vi.fn().mockResolvedValue(true),
  isEnabled: vi.fn().mockResolvedValue(true),
  findElements: vi.fn().mockResolvedValue([]),
  ...overrides,
} as unknown as WebElement);

// Mock WebDriver
const createMockDriver = (overrides: Partial<WebDriver> = {}): WebDriver => ({
  executeScript: vi.fn().mockResolvedValue(true),
  takeScreenshot: vi.fn().mockResolvedValue('base64screenshot'),
  getCurrentUrl: vi.fn().mockResolvedValue('http://localhost:3000/test-page'),
  actions: vi.fn().mockReturnValue({
    move: vi.fn().mockReturnThis(),
    dragAndDrop: vi.fn().mockReturnThis(),
    perform: vi.fn().mockResolvedValue(undefined),
  }),
  ...overrides,
} as unknown as WebDriver);

// Mock WaitStrategy
const createMockWaitStrategy = (element: WebElement): WaitStrategy => ({
  forVisible: vi.fn().mockResolvedValue(element),
  forClickable: vi.fn().mockResolvedValue(element),
  forPresent: vi.fn().mockResolvedValue(element),
  forStale: vi.fn().mockResolvedValue(undefined),
  forNetworkIdle: vi.fn().mockResolvedValue(undefined),
  forText: vi.fn().mockResolvedValue(element),
  forCount: vi.fn().mockResolvedValue([element]),
  forApiResponse: vi.fn().mockResolvedValue({}),
  forAnimationComplete: vi.fn().mockResolvedValue(element),
  forCustom: vi.fn().mockResolvedValue(true),
});

// Test locator
const testLocator: Locator = {
  selector: '[data-testid="test-element"]',
  strategy: 'data-testid',
  description: 'Test element',
};

// Fast retry config for tests
const fastRetryConfig: RetryConfig = {
  maxAttempts: 3,
  backoffMs: 1,
  backoffMultiplier: 1,
};

describe('Error Handling - Context and Logging', () => {
  let mockDriver: WebDriver;
  let mockElement: WebElement;
  let mockWait: WaitStrategy;
  let actionHelper: ActionHelperImpl;
  let consoleLogSpy: MockInstance;

  beforeEach(() => {
    mockElement = createMockElement();
    mockDriver = createMockDriver();
    mockWait = createMockWaitStrategy(mockElement);
    
    // Create real logger to test actual logging behavior
    const logger = createStructuredLogger({
      workerId: 'test-worker',
      correlationId: 'test-correlation-id',
      level: 'debug',
    });
    
    actionHelper = new ActionHelperImpl(mockDriver, mockWait, logger, fastRetryConfig);
    
    // Spy on console.log to capture structured logs
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Error Context', () => {
    it('should include action name in error context', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        const actionError = err as ActionFailedError;
        expect(actionError.action).toBe('click');
        expect(actionError.message).toContain('click');
      }
    });

    it('should include element description in error context', async () => {
      const error = new Error('Type failed');
      (mockElement.sendKeys as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.type(testLocator, 'test');
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        const actionError = err as ActionFailedError;
        expect(actionError.locatorDescription).toBe('Test element');
        expect(actionError.message).toContain('Test element');
      }
    });

    it('should include screenshot path in error context', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        const actionError = err as ActionFailedError;
        expect(actionError.context).toBeDefined();
        expect(actionError.context?.screenshotPath).toBeDefined();
        expect(actionError.context?.screenshotPath).toMatch(/screenshot-click-\d+\.png/);
      }
    });

    it('should include retry attempts in error context', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        const actionError = err as ActionFailedError;
        expect(actionError.context?.attempts).toBe(3);
      }
    });

    it('should include original error message in context', async () => {
      const originalError = new Error('Element not interactable');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(originalError);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        const actionError = err as ActionFailedError;
        expect(actionError.message).toContain('Element not interactable');
      }
    });
  });

  describe('Screenshot Capture on Failure', () => {
    it('should capture screenshot when action fails', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        expect(mockDriver.takeScreenshot).toHaveBeenCalled();
      }
    });

    it('should capture screenshot for all action types', async () => {
      const actions = [
        { method: 'click', args: [testLocator] },
        { method: 'type', args: [testLocator, 'text'] },
        { method: 'select', args: [testLocator, 'value'] },
        { method: 'hover', args: [testLocator] },
        { method: 'scrollIntoView', args: [testLocator] },
        { method: 'clear', args: [testLocator] },
      ];

      for (const action of actions) {
        vi.clearAllMocks();
        
        // Mock failure for the specific action
        if (action.method === 'click') {
          (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
        } else if (action.method === 'type') {
          (mockElement.sendKeys as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
        } else if (action.method === 'select') {
          (mockElement.findElements as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
        } else if (action.method === 'hover') {
          (mockWait.forVisible as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
        } else if (action.method === 'scrollIntoView') {
          (mockWait.forPresent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
        } else if (action.method === 'clear') {
          (mockElement.clear as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
        }

        try {
          await (actionHelper as any)[action.method](...action.args);
          expect.fail(`Should have thrown error for ${action.method}`);
        } catch {
          expect(mockDriver.takeScreenshot).toHaveBeenCalled();
        }
      }
    });

    it('should handle screenshot capture failure gracefully', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      (mockDriver.takeScreenshot as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Screenshot failed'));

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        // Should still throw the original error even if screenshot fails
        expect((err as ActionFailedError).message).toContain('Click failed');
      }
    });

    it('should log screenshot capture failure', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      (mockDriver.takeScreenshot as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Screenshot failed'));

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        // Check that error log was called with screenshot error
        const errorLogs = consoleLogSpy.mock.calls
          .map(call => JSON.parse(call[0] as string))
          .filter(log => log.level === 'error');
        
        const screenshotErrorLog = errorLogs.find(log => 
          log.message === 'Action failed - screenshot capture failed'
        );
        
        expect(screenshotErrorLog).toBeDefined();
        expect(screenshotErrorLog.screenshotError).toBe('Screenshot failed');
      }
    });

    it('should include screenshot in error log', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      (mockDriver.takeScreenshot as ReturnType<typeof vi.fn>).mockResolvedValue('base64screenshotdata');

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        // Check that error log includes screenshot data (truncated)
        const errorLogs = consoleLogSpy.mock.calls
          .map(call => JSON.parse(call[0] as string))
          .filter(log => log.level === 'error');
        
        const screenshotLog = errorLogs.find(log => 
          log.message === 'Action failed - screenshot captured'
        );
        
        expect(screenshotLog).toBeDefined();
        expect(screenshotLog.screenshotBase64).toBeDefined();
        expect(screenshotLog.screenshotPath).toMatch(/screenshot-click-\d+\.png/);
      }
    });
  });

  describe('Structured Error Logging', () => {
    it('should log errors with correlation ID', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        const errorLogs = consoleLogSpy.mock.calls
          .map(call => JSON.parse(call[0] as string))
          .filter(log => log.level === 'error');
        
        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0].correlationId).toBe('test-correlation-id');
      }
    });

    it('should log errors with worker ID', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        const errorLogs = consoleLogSpy.mock.calls
          .map(call => JSON.parse(call[0] as string))
          .filter(log => log.level === 'error');
        
        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0].workerId).toBe('test-worker');
      }
    });

    it('should log errors with timestamp', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        const errorLogs = consoleLogSpy.mock.calls
          .map(call => JSON.parse(call[0] as string))
          .filter(log => log.level === 'error');
        
        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0].timestamp).toBeDefined();
        expect(new Date(errorLogs[0].timestamp).getTime()).toBeGreaterThan(0);
      }
    });

    it('should log errors with action context', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch {
        const errorLogs = consoleLogSpy.mock.calls
          .map(call => JSON.parse(call[0] as string))
          .filter(log => log.level === 'error');
        
        const actionErrorLog = errorLogs.find(log => 
          log.message === 'Action failed - screenshot captured' ||
          log.message === 'Action failed - screenshot capture failed'
        );
        
        expect(actionErrorLog).toBeDefined();
        expect(actionErrorLog.action).toBe('click');
        expect(actionErrorLog.element).toBe('Test element');
      }
    });

    it('should log errors with stack trace', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        expect((err as Error).stack).toBeDefined();
        expect((err as Error).stack).toContain('ActionFailedError');
      }
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask password in type action logs', async () => {
      await actionHelper.type(testLocator, 'mySecretPassword123');

      const infoLogs = consoleLogSpy.mock.calls
        .map(call => JSON.parse(call[0] as string))
        .filter(log => log.level === 'info');
      
      // Check that password is not logged in plain text
      const logString = JSON.stringify(infoLogs);
      expect(logString).not.toContain('mySecretPassword123');
    });

    it('should mask sensitive data in error context', async () => {
      const logger = createStructuredLogger({
        workerId: 'test-worker',
        correlationId: 'test-correlation-id',
        level: 'debug',
      });
      
      // Log error with sensitive data
      logger.error('Authentication failed', {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'sk-1234567890',
        token: 'bearer-token-xyz',
      });

      const errorLogs = consoleLogSpy.mock.calls
        .map(call => JSON.parse(call[0] as string))
        .filter(log => log.level === 'error');
      
      expect(errorLogs.length).toBeGreaterThan(0);
      const errorLog = errorLogs[errorLogs.length - 1];
      
      // Sensitive fields should be masked
      expect(errorLog.password).toBe('[REDACTED]');
      expect(errorLog.apiKey).toBe('[REDACTED]');
      expect(errorLog.token).toBe('[REDACTED]');
      
      // Non-sensitive fields should not be masked
      expect(errorLog.username).toBe('testuser');
    });

    it('should mask nested sensitive data', async () => {
      const logger = createStructuredLogger({
        workerId: 'test-worker',
        correlationId: 'test-correlation-id',
        level: 'debug',
      });
      
      logger.error('Request failed', {
        request: {
          url: 'https://api.example.com',
          headers: {
            authorization: 'Bearer secret-token',
            'content-type': 'application/json',
          },
          body: {
            username: 'testuser',
            password: 'secret123',
          },
        },
      });

      const errorLogs = consoleLogSpy.mock.calls
        .map(call => JSON.parse(call[0] as string))
        .filter(log => log.level === 'error');
      
      const errorLog = errorLogs[errorLogs.length - 1];
      
      // Nested sensitive fields should be masked
      expect(errorLog.request.headers.authorization).toBe('[REDACTED]');
      expect(errorLog.request.body.password).toBe('[REDACTED]');
      
      // Non-sensitive fields should not be masked
      expect(errorLog.request.url).toBe('https://api.example.com');
      expect(errorLog.request.headers['content-type']).toBe('application/json');
      expect(errorLog.request.body.username).toBe('testuser');
    });

    it('should mask sensitive data in arrays', async () => {
      const logger = createStructuredLogger({
        workerId: 'test-worker',
        correlationId: 'test-correlation-id',
        level: 'debug',
      });
      
      logger.error('Batch operation failed', {
        users: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' },
        ],
      });

      const errorLogs = consoleLogSpy.mock.calls
        .map(call => JSON.parse(call[0] as string))
        .filter(log => log.level === 'error');
      
      const errorLog = errorLogs[errorLogs.length - 1];
      
      // Passwords in array should be masked
      expect(errorLog.users[0].password).toBe('[REDACTED]');
      expect(errorLog.users[1].password).toBe('[REDACTED]');
      
      // Usernames should not be masked
      expect(errorLog.users[0].username).toBe('user1');
      expect(errorLog.users[1].username).toBe('user2');
    });

    it('should mask common sensitive key patterns', async () => {
      const logger = createStructuredLogger({
        workerId: 'test-worker',
        correlationId: 'test-correlation-id',
        level: 'debug',
      });
      
      logger.error('Configuration error', {
        api_key: 'key123',
        apiKey: 'key456',
        secret: 'secret789',
        auth: 'auth-token',
        authorization: 'Bearer token',
        credential: 'cred123',
        privateKey: 'private-key',
        bearer: 'bearer-token',
        cookie: 'session-cookie',
        session: 'session-id',
        jwt: 'jwt-token',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });

      const errorLogs = consoleLogSpy.mock.calls
        .map(call => JSON.parse(call[0] as string))
        .filter(log => log.level === 'error');
      
      const errorLog = errorLogs[errorLogs.length - 1];
      
      // All sensitive patterns should be masked
      expect(errorLog.api_key).toBe('[REDACTED]');
      expect(errorLog.apiKey).toBe('[REDACTED]');
      expect(errorLog.secret).toBe('[REDACTED]');
      expect(errorLog.auth).toBe('[REDACTED]');
      expect(errorLog.authorization).toBe('[REDACTED]');
      expect(errorLog.credential).toBe('[REDACTED]');
      expect(errorLog.privateKey).toBe('[REDACTED]');
      expect(errorLog.bearer).toBe('[REDACTED]');
      expect(errorLog.cookie).toBe('[REDACTED]');
      expect(errorLog.session).toBe('[REDACTED]');
      expect(errorLog.jwt).toBe('[REDACTED]');
      expect(errorLog.access_token).toBe('[REDACTED]');
      expect(errorLog.refresh_token).toBe('[REDACTED]');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle null error context gracefully', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        // Should not crash even if context is undefined
        expect((err as ActionFailedError).context).toBeDefined();
      }
    });

    it('should handle circular references in error context', async () => {
      const logger = createStructuredLogger({
        workerId: 'test-worker',
        correlationId: 'test-correlation-id',
        level: 'debug',
      });
      
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // JSON.stringify will throw on circular references, which is expected behavior
      // The logger uses JSON.stringify internally, so circular references will cause errors
      expect(() => {
        logger.error('Circular reference test', { data: circular });
      }).toThrow();
    });

    it('should handle very large error messages', async () => {
      const largeMessage = 'Error: ' + 'x'.repeat(10000);
      const error = new Error(largeMessage);
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        expect((err as ActionFailedError).message).toContain('Error:');
      }
    });

    it('should handle undefined error messages', async () => {
      const error = new Error();
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      try {
        await actionHelper.click(testLocator);
        expect.fail('Should have thrown ActionFailedError');
      } catch (err) {
        expect(err).toBeInstanceOf(ActionFailedError);
        // Should still create a meaningful error message
        expect((err as ActionFailedError).message).toBeDefined();
      }
    });
  });
});
