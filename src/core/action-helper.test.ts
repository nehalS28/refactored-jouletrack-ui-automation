/**
 * Unit tests for ActionHelper implementation.
 * Tests common UI interactions, retry logic, and error handling.
 * 
 * @module core/action-helper.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionHelperImpl, createActionHelper } from './action-helper.js';
import type { WebDriver, WebElement } from 'selenium-webdriver';
import type { Locator } from '../types/locator.types.js';
import type { StructuredLogger, WaitStrategy } from '../types/context.types.js';
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

// Mock Logger
const createMockLogger = (): StructuredLogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setTestId: vi.fn(),
  clearTestId: vi.fn(),
});

// Test locator
const testLocator: Locator = {
  selector: '[data-testid="test-element"]',
  strategy: 'data-testid',
  description: 'Test element',
};

// Default retry config
const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  backoffMs: 100,
  backoffMultiplier: 2,
};

// Fast retry config for failure tests (no fake timers needed)
const fastRetryConfig: RetryConfig = {
  maxAttempts: 3,
  backoffMs: 1,
  backoffMultiplier: 1,
};

describe('ActionHelperImpl', () => {
  let mockDriver: WebDriver;
  let mockElement: WebElement;
  let mockWait: WaitStrategy;
  let mockLogger: StructuredLogger;
  let actionHelper: ActionHelperImpl;

  beforeEach(() => {
    vi.useFakeTimers();
    mockElement = createMockElement();
    mockDriver = createMockDriver();
    mockWait = createMockWaitStrategy(mockElement);
    mockLogger = createMockLogger();
    actionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, defaultRetryConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('click', () => {
    it('should wait for element to be clickable and click it', async () => {
      const clickPromise = actionHelper.click(testLocator);
      await vi.runAllTimersAsync();
      await clickPromise;

      expect(mockWait.forClickable).toHaveBeenCalledWith(testLocator);
      expect(mockElement.click).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Action started', expect.objectContaining({ action: 'click' }));
      expect(mockLogger.info).toHaveBeenCalledWith('Action completed', expect.objectContaining({ action: 'click' }));
    });

    it('should scroll element into view if not in viewport', async () => {
      (mockDriver.executeScript as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      
      const clickPromise = actionHelper.click(testLocator);
      await vi.runAllTimersAsync();
      await clickPromise;

      expect(mockDriver.executeScript).toHaveBeenCalled();
    });

    it('should retry on failure with exponential backoff', async () => {
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      const clickPromise = actionHelper.click(testLocator);
      await vi.runAllTimersAsync();
      await clickPromise;

      expect(mockElement.click).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenCalledWith('Action failed, retrying', expect.objectContaining({
        action: 'click',
        attempt: 1,
      }));
    });

    it('should throw ActionFailedError after all retries fail', async () => {
      // Use real timers and fast retry config for this test
      vi.useRealTimers();
      const fastActionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, fastRetryConfig);
      
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(fastActionHelper.click(testLocator)).rejects.toThrow(ActionFailedError);
      
      expect(mockElement.click).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalled();
      
      vi.useFakeTimers();
    });

    it('should capture screenshot on failure', async () => {
      // Use real timers and fast retry config for this test
      vi.useRealTimers();
      const fastActionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, fastRetryConfig);
      
      const error = new Error('Click failed');
      (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(fastActionHelper.click(testLocator)).rejects.toThrow();
      
      expect(mockDriver.takeScreenshot).toHaveBeenCalled();
      
      vi.useFakeTimers();
    });
  });

  describe('type', () => {
    it('should wait for element and type text', async () => {
      const typePromise = actionHelper.type(testLocator, 'test input');
      await vi.runAllTimersAsync();
      await typePromise;

      expect(mockWait.forClickable).toHaveBeenCalledWith(testLocator);
      expect(mockElement.sendKeys).toHaveBeenCalledWith('test input');
    });

    it('should log action start and completion', async () => {
      const typePromise = actionHelper.type(testLocator, 'test input');
      await vi.runAllTimersAsync();
      await typePromise;

      expect(mockLogger.info).toHaveBeenCalledWith('Action started', expect.objectContaining({ action: 'type' }));
      expect(mockLogger.info).toHaveBeenCalledWith('Action completed', expect.objectContaining({ action: 'type' }));
    });
  });

  describe('select', () => {
    it('should select option by value', async () => {
      const mockOption = createMockElement({
        getAttribute: vi.fn().mockResolvedValue('option-value'),
        getText: vi.fn().mockResolvedValue('Option Text'),
        click: vi.fn().mockResolvedValue(undefined),
      });
      (mockElement.findElements as ReturnType<typeof vi.fn>).mockResolvedValue([mockOption]);

      const selectPromise = actionHelper.select(testLocator, 'option-value');
      await vi.runAllTimersAsync();
      await selectPromise;

      expect(mockOption.click).toHaveBeenCalled();
    });

    it('should select option by visible text', async () => {
      const mockOption = createMockElement({
        getAttribute: vi.fn().mockResolvedValue('different-value'),
        getText: vi.fn().mockResolvedValue('Option Text'),
        click: vi.fn().mockResolvedValue(undefined),
      });
      (mockElement.findElements as ReturnType<typeof vi.fn>).mockResolvedValue([mockOption]);

      const selectPromise = actionHelper.select(testLocator, 'Option Text');
      await vi.runAllTimersAsync();
      await selectPromise;

      expect(mockOption.click).toHaveBeenCalled();
    });

    it('should throw error if option not found', async () => {
      // Use real timers and fast retry config for this test
      vi.useRealTimers();
      const fastActionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, fastRetryConfig);
      
      const mockOption = createMockElement({
        getAttribute: vi.fn().mockResolvedValue('other-value'),
        getText: vi.fn().mockResolvedValue('Other Text'),
      });
      (mockElement.findElements as ReturnType<typeof vi.fn>).mockResolvedValue([mockOption]);

      await expect(fastActionHelper.select(testLocator, 'non-existent')).rejects.toThrow(ActionFailedError);
      
      vi.useFakeTimers();
    });
  });

  describe('hover', () => {
    it('should move mouse to element', async () => {
      const mockActions = {
        move: vi.fn().mockReturnThis(),
        perform: vi.fn().mockResolvedValue(undefined),
      };
      (mockDriver.actions as ReturnType<typeof vi.fn>).mockReturnValue(mockActions);

      const hoverPromise = actionHelper.hover(testLocator);
      await vi.runAllTimersAsync();
      await hoverPromise;

      expect(mockWait.forVisible).toHaveBeenCalledWith(testLocator);
      expect(mockActions.move).toHaveBeenCalledWith({ origin: mockElement });
      expect(mockActions.perform).toHaveBeenCalled();
    });
  });

  describe('dragDrop', () => {
    it('should drag source element to target', async () => {
      const mockTargetElement = createMockElement();
      const mockActions = {
        dragAndDrop: vi.fn().mockReturnThis(),
        perform: vi.fn().mockResolvedValue(undefined),
      };
      (mockDriver.actions as ReturnType<typeof vi.fn>).mockReturnValue(mockActions);
      (mockWait.forVisible as ReturnType<typeof vi.fn>).mockResolvedValue(mockTargetElement);

      const targetLocator: Locator = {
        selector: '[data-testid="target"]',
        strategy: 'data-testid',
        description: 'Target element',
      };

      const dragDropPromise = actionHelper.dragDrop(testLocator, targetLocator);
      await vi.runAllTimersAsync();
      await dragDropPromise;

      expect(mockWait.forClickable).toHaveBeenCalledWith(testLocator);
      expect(mockWait.forVisible).toHaveBeenCalledWith(targetLocator);
      expect(mockActions.dragAndDrop).toHaveBeenCalledWith(mockElement, mockTargetElement);
    });
  });

  describe('scrollIntoView', () => {
    it('should scroll element into view', async () => {
      const scrollPromise = actionHelper.scrollIntoView(testLocator);
      await vi.runAllTimersAsync();
      await scrollPromise;

      expect(mockWait.forPresent).toHaveBeenCalledWith(testLocator);
      expect(mockDriver.executeScript).toHaveBeenCalledWith(
        expect.stringContaining('scrollIntoView'),
        mockElement
      );
    });
  });

  describe('clear', () => {
    it('should clear element content', async () => {
      const clearPromise = actionHelper.clear(testLocator);
      await vi.runAllTimersAsync();
      await clearPromise;

      expect(mockWait.forClickable).toHaveBeenCalledWith(testLocator);
      expect(mockElement.clear).toHaveBeenCalled();
    });
  });

  describe('getText', () => {
    it('should return element text', async () => {
      (mockElement.getText as ReturnType<typeof vi.fn>).mockResolvedValue('Element text');

      const getTextPromise = actionHelper.getText(testLocator);
      await vi.runAllTimersAsync();
      const result = await getTextPromise;

      expect(mockWait.forVisible).toHaveBeenCalledWith(testLocator);
      expect(result).toBe('Element text');
    });
  });

  describe('getAttribute', () => {
    it('should return attribute value', async () => {
      (mockElement.getAttribute as ReturnType<typeof vi.fn>).mockResolvedValue('attr-value');

      const getAttrPromise = actionHelper.getAttribute(testLocator, 'data-custom');
      await vi.runAllTimersAsync();
      const result = await getAttrPromise;

      expect(mockWait.forPresent).toHaveBeenCalledWith(testLocator);
      expect(mockElement.getAttribute).toHaveBeenCalledWith('data-custom');
      expect(result).toBe('attr-value');
    });

    it('should return null for non-existent attribute', async () => {
      (mockElement.getAttribute as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const getAttrPromise = actionHelper.getAttribute(testLocator, 'non-existent');
      await vi.runAllTimersAsync();
      const result = await getAttrPromise;

      expect(result).toBeNull();
    });
  });

  describe('isDisplayed', () => {
    it('should return true when element is displayed', async () => {
      (mockElement.isDisplayed as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await actionHelper.isDisplayed(testLocator);

      expect(mockWait.forPresent).toHaveBeenCalledWith(testLocator);
      expect(result).toBe(true);
    });

    it('should return false when element is not displayed', async () => {
      (mockElement.isDisplayed as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await actionHelper.isDisplayed(testLocator);

      expect(result).toBe(false);
    });

    it('should return false when element is not found', async () => {
      (mockWait.forPresent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));

      const result = await actionHelper.isDisplayed(testLocator);

      expect(result).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return true when element is enabled', async () => {
      (mockElement.isEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await actionHelper.isEnabled(testLocator);

      expect(mockWait.forPresent).toHaveBeenCalledWith(testLocator);
      expect(result).toBe(true);
    });

    it('should return false when element is disabled', async () => {
      (mockElement.isEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await actionHelper.isEnabled(testLocator);

      expect(result).toBe(false);
    });

    it('should return false when element is not found', async () => {
      (mockWait.forPresent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));

      const result = await actionHelper.isEnabled(testLocator);

      expect(result).toBe(false);
    });
  });
});

describe('createActionHelper', () => {
  it('should create an ActionHelper instance', () => {
    const mockElement = createMockElement();
    const mockDriver = createMockDriver();
    const mockWait = createMockWaitStrategy(mockElement);
    const mockLogger = createMockLogger();

    const actionHelper = createActionHelper(mockDriver, mockWait, mockLogger, defaultRetryConfig);

    expect(actionHelper).toBeDefined();
    expect(actionHelper.click).toBeDefined();
    expect(actionHelper.type).toBeDefined();
    expect(actionHelper.select).toBeDefined();
    expect(actionHelper.hover).toBeDefined();
    expect(actionHelper.dragDrop).toBeDefined();
    expect(actionHelper.scrollIntoView).toBeDefined();
    expect(actionHelper.clear).toBeDefined();
    expect(actionHelper.getText).toBeDefined();
    expect(actionHelper.getAttribute).toBeDefined();
    expect(actionHelper.isDisplayed).toBeDefined();
    expect(actionHelper.isEnabled).toBeDefined();
  });
});

describe('ActionHelper retry behavior', () => {
  it('should use exponential backoff between retries', async () => {
    vi.useFakeTimers();
    
    const mockElement = createMockElement();
    const mockDriver = createMockDriver();
    const mockWait = createMockWaitStrategy(mockElement);
    const mockLogger = createMockLogger();
    
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      backoffMs: 100,
      backoffMultiplier: 2,
    };
    
    const actionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, retryConfig);
    
    const error = new Error('Click failed');
    (mockElement.click as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    const clickPromise = actionHelper.click(testLocator);
    
    // First attempt fails immediately
    await vi.advanceTimersByTimeAsync(0);
    
    // Wait for first backoff (100ms)
    await vi.advanceTimersByTimeAsync(100);
    
    // Second attempt fails
    await vi.advanceTimersByTimeAsync(0);
    
    // Wait for second backoff (200ms = 100 * 2)
    await vi.advanceTimersByTimeAsync(200);
    
    // Third attempt succeeds
    await vi.runAllTimersAsync();
    await clickPromise;

    expect(mockElement.click).toHaveBeenCalledTimes(3);
    
    vi.useRealTimers();
  });
});

describe('ActionHelper edge cases', () => {
  let mockDriver: WebDriver;
  let mockElement: WebElement;
  let mockWait: WaitStrategy;
  let mockLogger: StructuredLogger;
  let actionHelper: ActionHelperImpl;

  beforeEach(() => {
    vi.useFakeTimers();
    mockElement = createMockElement();
    mockDriver = createMockDriver();
    mockWait = createMockWaitStrategy(mockElement);
    mockLogger = createMockLogger();
    actionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, defaultRetryConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should handle empty text in type action', async () => {
    const typePromise = actionHelper.type(testLocator, '');
    await vi.runAllTimersAsync();
    await typePromise;

    expect(mockElement.sendKeys).toHaveBeenCalledWith('');
  });

  it('should handle special characters in type action', async () => {
    const specialText = '<script>alert("xss")</script>';
    
    const typePromise = actionHelper.type(testLocator, specialText);
    await vi.runAllTimersAsync();
    await typePromise;

    expect(mockElement.sendKeys).toHaveBeenCalledWith(specialText);
  });

  it('should handle screenshot failure gracefully', async () => {
    // Use real timers for this test
    vi.useRealTimers();
    const fastActionHelper = new ActionHelperImpl(mockDriver, mockWait, mockLogger, fastRetryConfig);
    
    const error = new Error('Click failed');
    (mockElement.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);
    (mockDriver.takeScreenshot as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Screenshot failed'));

    await expect(fastActionHelper.click(testLocator)).rejects.toThrow(ActionFailedError);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Action failed - screenshot capture failed',
      expect.objectContaining({ screenshotError: 'Screenshot failed' })
    );
    
    vi.useFakeTimers();
  });
});
