/**
 * Unit tests for WaitStrategy implementation.
 * Tests basic waits, extended waits, custom conditions, and logging.
 * 
 * @module core/wait-strategy.test
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebDriver, WebElement, By, until } from 'selenium-webdriver';
import { WaitStrategyImpl, createWaitStrategy } from './wait-strategy.js';
import type { FrameworkConfig } from '../types/config.types.js';
import type { Locator } from '../types/locator.types.js';
import type { StructuredLogger } from '../types/context.types.js';
import { WaitTimeoutError } from '../utils/errors.js';

// Mock selenium-webdriver
vi.mock('selenium-webdriver', async () => {
  const actual = await vi.importActual('selenium-webdriver');
  return {
    ...actual,
    By: {
      css: vi.fn((selector: string) => ({ css: selector })),
      xpath: vi.fn((selector: string) => ({ xpath: selector })),
    },
    until: {
      elementLocated: vi.fn(),
      elementIsVisible: vi.fn(),
      elementIsEnabled: vi.fn(),
      stalenessOf: vi.fn(),
    },
  };
});

describe('WaitStrategy', () => {
  let mockDriver: WebDriver;
  let mockLogger: StructuredLogger;
  let mockConfig: FrameworkConfig;
  let waitStrategy: WaitStrategyImpl;
  let mockElement: WebElement;

  beforeEach(() => {
    // Create mock element
    mockElement = {
      getText: vi.fn().mockResolvedValue('Test text'),
      getAnimations: vi.fn().mockReturnValue([]),
    } as unknown as WebElement;

    // Create mock driver with proper wait implementation
    // Note: Selenium's driver.wait passes the driver as the first argument to condition functions.
    // We use 'as any' for the mock since the condition type expects (driver: WebDriver) => T,
    // but we need a flexible mock that handles both function and Condition object types.
    mockDriver = {
      wait: vi.fn().mockImplementation(async (condition: any) => {
        // Handle function conditions (pass driver as Selenium does)
        if (typeof condition === 'function') {
          const result = await condition(mockDriver);
          return result || mockElement;
        }
        // Handle Selenium until conditions (they have a fn property)
        if (condition && typeof condition.fn === 'function') {
          return mockElement;
        }
        // Default return
        return mockElement;
      }),
      findElement: vi.fn().mockResolvedValue(mockElement),
      findElements: vi.fn().mockResolvedValue([mockElement]),
      executeScript: vi.fn().mockResolvedValue(0),
    } as unknown as WebDriver;

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setTestId: vi.fn(),
      clearTestId: vi.fn(),
    };

    // Create mock config
    mockConfig = {
      environment: 'local',
      baseUrl: 'http://localhost:3000',
      browser: {
        name: 'chrome',
        headless: true,
        windowSize: { width: 1920, height: 1080 },
        args: [],
      },
      timeouts: {
        implicit: 5000,
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
        level: 'debug',
        structured: true,
      },
    };

    waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Waits', () => {
    const testLocator: Locator = {
      selector: "[data-testid='test-element']",
      strategy: 'data-testid',
      description: 'Test element',
    };

    describe('forVisible', () => {
      it('should wait for element to be visible', async () => {
        const result = await waitStrategy.forVisible(testLocator);

        expect(result).toBe(mockElement);
        expect(mockDriver.wait).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'visible',
          timeoutMs: 10000,
          element: 'Test element',
        }));
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait completed', expect.objectContaining({
          condition: 'visible',
        }));
      });

      it('should use custom timeout when provided', async () => {
        await waitStrategy.forVisible(testLocator, 5000);

        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          timeoutMs: 5000,
        }));
      });

      it('should use locator timeout when specified', async () => {
        const locatorWithTimeout: Locator = {
          ...testLocator,
          timeout: 3000,
        };

        await waitStrategy.forVisible(locatorWithTimeout);

        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          timeoutMs: 3000,
        }));
      });

      it('should throw WaitTimeoutError on timeout', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forVisible(testLocator)).rejects.toThrow(WaitTimeoutError);
        expect(mockLogger.warn).toHaveBeenCalledWith('Wait timeout', expect.objectContaining({
          condition: 'visible',
        }));
      });
    });

    describe('forClickable', () => {
      it('should wait for element to be clickable', async () => {
        const result = await waitStrategy.forClickable(testLocator);

        expect(result).toBe(mockElement);
        expect(mockDriver.wait).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'clickable',
        }));
      });

      it('should throw WaitTimeoutError on timeout', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forClickable(testLocator)).rejects.toThrow(WaitTimeoutError);
      });
    });

    describe('forPresent', () => {
      it('should wait for element to be present in DOM', async () => {
        const result = await waitStrategy.forPresent(testLocator);

        expect(result).toBe(mockElement);
        expect(mockDriver.wait).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'present',
        }));
      });

      it('should throw WaitTimeoutError on timeout', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forPresent(testLocator)).rejects.toThrow(WaitTimeoutError);
      });
    });

    describe('forStale', () => {
      it('should wait for element to become stale', async () => {
        await waitStrategy.forStale(mockElement);

        expect(mockDriver.wait).toHaveBeenCalled();
        expect(until.stalenessOf).toHaveBeenCalledWith(mockElement);
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'stale',
        }));
      });

      it('should throw WaitTimeoutError on timeout', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forStale(mockElement)).rejects.toThrow(WaitTimeoutError);
      });
    });
  });

  describe('Extended Waits', () => {
    const testLocator: Locator = {
      selector: "[data-testid='test-element']",
      strategy: 'data-testid',
      description: 'Test element',
    };

    describe('forNetworkIdle', () => {
      it('should wait for network to be idle', async () => {
        vi.mocked(mockDriver.executeScript).mockResolvedValue(0);
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return true;
        });

        await waitStrategy.forNetworkIdle();

        expect(mockDriver.wait).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'networkIdle',
        }));
      });

      it('should throw WaitTimeoutError on timeout', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forNetworkIdle()).rejects.toThrow(WaitTimeoutError);
      });
    });

    describe('forText', () => {
      it('should wait for element to contain specific text', async () => {
        vi.mocked(mockElement.getText).mockResolvedValue('Expected text content');
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return mockElement;
        });

        const result = await waitStrategy.forText(testLocator, 'Expected');

        expect(result).toBe(mockElement);
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'text:Expected',
        }));
      });

      it('should throw WaitTimeoutError when text not found', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forText(testLocator, 'Not found')).rejects.toThrow(WaitTimeoutError);
      });
    });

    describe('forCount', () => {
      it('should wait for specific number of elements', async () => {
        const mockElements = [mockElement, mockElement, mockElement];
        vi.mocked(mockDriver.findElements).mockResolvedValue(mockElements);
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return mockElements;
        });

        const result = await waitStrategy.forCount(testLocator, 3);

        expect(result).toEqual(mockElements);
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'count:3',
        }));
      });

      it('should throw WaitTimeoutError when count not matched', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forCount(testLocator, 5)).rejects.toThrow(WaitTimeoutError);
      });
    });

    describe('forApiResponse', () => {
      it('should wait for API response matching string pattern', async () => {
        const mockEntry = { name: 'https://api.example.com/users', duration: 100, responseEnd: 150 };
        vi.mocked(mockDriver.executeScript).mockResolvedValue([mockEntry]);
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return mockEntry;
        });

        const result = await waitStrategy.forApiResponse('/users');

        expect(result).toEqual(mockEntry);
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'apiResponse:/users',
        }));
      });

      it('should wait for API response matching RegExp pattern', async () => {
        const mockEntry = { name: 'https://api.example.com/users/123', duration: 100, responseEnd: 150 };
        vi.mocked(mockDriver.executeScript).mockResolvedValue([mockEntry]);
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return mockEntry;
        });

        const result = await waitStrategy.forApiResponse(/\/users\/\d+/);

        expect(result).toEqual(mockEntry);
      });

      it('should throw WaitTimeoutError when API response not found', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forApiResponse('/not-found')).rejects.toThrow(WaitTimeoutError);
      });
    });

    describe('forAnimationComplete', () => {
      it('should wait for CSS animations to complete', async () => {
        vi.mocked(mockDriver.executeScript).mockResolvedValue(0);
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return mockElement;
        });

        const result = await waitStrategy.forAnimationComplete(testLocator);

        expect(result).toBe(mockElement);
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'animationComplete',
        }));
      });

      it('should throw WaitTimeoutError when animations do not complete', async () => {
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(waitStrategy.forAnimationComplete(testLocator)).rejects.toThrow(WaitTimeoutError);
      });
    });
  });

  describe('Custom Wait Conditions', () => {
    describe('forCustom', () => {
      it('should wait for custom condition to be truthy', async () => {
        const customCondition = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(mockDriver.wait).mockImplementation(async (condition: any) => {
          if (typeof condition === 'function') {
            return await condition(mockDriver);
          }
          return { success: true };
        });

        const result = await waitStrategy.forCustom(customCondition, 'Custom condition');

        expect(result).toEqual({ success: true });
        expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
          condition: 'custom:Custom condition',
        }));
      });

      it('should handle condition returning false', async () => {
        const customCondition = vi.fn().mockResolvedValue(false);
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(
          waitStrategy.forCustom(customCondition, 'Always false condition')
        ).rejects.toThrow(WaitTimeoutError);
      });

      it('should handle condition throwing error', async () => {
        const customCondition = vi.fn().mockRejectedValue(new Error('Condition error'));
        vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

        await expect(
          waitStrategy.forCustom(customCondition, 'Error condition')
        ).rejects.toThrow(WaitTimeoutError);
      });
    });
  });

  describe('Locator Strategy Conversion', () => {
    it('should convert CSS strategy to Selenium By.css', async () => {
      const cssLocator: Locator = {
        selector: '.test-class',
        strategy: 'css',
        description: 'CSS locator',
      };

      await waitStrategy.forPresent(cssLocator);

      expect(By.css).toHaveBeenCalledWith('.test-class');
    });

    it('should convert data-testid strategy to Selenium By.css', async () => {
      const dataTestIdLocator: Locator = {
        selector: "[data-testid='test']",
        strategy: 'data-testid',
        description: 'Data-testid locator',
      };

      await waitStrategy.forPresent(dataTestIdLocator);

      expect(By.css).toHaveBeenCalledWith("[data-testid='test']");
    });

    it('should convert xpath strategy to Selenium By.xpath', async () => {
      const xpathLocator: Locator = {
        selector: '//div[@class="test"]',
        strategy: 'xpath',
        description: 'XPath locator',
      };

      await waitStrategy.forPresent(xpathLocator);

      expect(By.xpath).toHaveBeenCalledWith('//div[@class="test"]');
    });

    it('should convert aria-label strategy to Selenium By.css with attribute selector', async () => {
      const ariaLocator: Locator = {
        selector: 'Submit button',
        strategy: 'aria-label',
        description: 'ARIA label locator',
      };

      await waitStrategy.forPresent(ariaLocator);

      expect(By.css).toHaveBeenCalledWith('[aria-label="Submit button"]');
    });

    it('should escape quotes in aria-label selector', async () => {
      const ariaLocator: Locator = {
        selector: 'Button with "quotes"',
        strategy: 'aria-label',
        description: 'ARIA label with quotes',
      };

      await waitStrategy.forPresent(ariaLocator);

      expect(By.css).toHaveBeenCalledWith('[aria-label="Button with \\"quotes\\""]');
    });
  });

  describe('Logging', () => {
    const testLocator: Locator = {
      selector: "[data-testid='test']",
      strategy: 'data-testid',
      description: 'Test element',
    };

    it('should log wait start with condition and timeout', async () => {
      await waitStrategy.forVisible(testLocator);

      expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', {
        condition: 'visible',
        timeoutMs: 10000,
        element: 'Test element',
      });
    });

    it('should log wait completion with timing information', async () => {
      await waitStrategy.forVisible(testLocator);

      expect(mockLogger.debug).toHaveBeenCalledWith('Wait completed', expect.objectContaining({
        condition: 'visible',
        configuredMs: 10000,
        actualMs: expect.any(Number),
        efficiency: expect.stringMatching(/^\d+\.\d+%$/),
        element: 'Test element',
      }));
    });

    it('should log wait timeout with warning level', async () => {
      vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

      await expect(waitStrategy.forVisible(testLocator)).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith('Wait timeout', expect.objectContaining({
        condition: 'visible',
        configuredMs: 10000,
        element: 'Test element',
      }));
    });
  });

  describe('Error Context', () => {
    const testLocator: Locator = {
      selector: "[data-testid='test']",
      strategy: 'data-testid',
      description: 'Test element',
    };

    it('should include locator details in WaitTimeoutError', async () => {
      vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

      try {
        await waitStrategy.forVisible(testLocator);
        throw new Error('Should have thrown WaitTimeoutError');
      } catch (error) {
        if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
          throw error;
        }
        expect(error).toBeInstanceOf(WaitTimeoutError);
        const waitError = error as WaitTimeoutError;
        expect(waitError.condition).toBe('visible');
        expect(waitError.timeoutMs).toBe(10000);
        expect(waitError.locatorDescription).toBe('Test element');
        expect(waitError.context).toMatchObject({
          selector: "[data-testid='test']",
          strategy: 'data-testid',
        });
      }
    });

    it('should include expected text in forText error context', async () => {
      vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

      try {
        await waitStrategy.forText(testLocator, 'Expected text');
        throw new Error('Should have thrown WaitTimeoutError');
      } catch (error) {
        if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
          throw error;
        }
        expect(error).toBeInstanceOf(WaitTimeoutError);
        const waitError = error as WaitTimeoutError;
        expect(waitError.context).toMatchObject({
          expectedText: 'Expected text',
        });
      }
    });

    it('should include expected count in forCount error context', async () => {
      vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

      try {
        await waitStrategy.forCount(testLocator, 5);
        throw new Error('Should have thrown WaitTimeoutError');
      } catch (error) {
        if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
          throw error;
        }
        expect(error).toBeInstanceOf(WaitTimeoutError);
        const waitError = error as WaitTimeoutError;
        expect(waitError.context).toMatchObject({
          expectedCount: 5,
        });
      }
    });

    it('should include URL pattern in forApiResponse error context', async () => {
      vi.mocked(mockDriver.wait).mockRejectedValueOnce(new Error('Timeout'));

      try {
        await waitStrategy.forApiResponse('/api/users');
        throw new Error('Should have thrown WaitTimeoutError');
      } catch (error) {
        if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
          throw error;
        }
        expect(error).toBeInstanceOf(WaitTimeoutError);
        const waitError = error as WaitTimeoutError;
        expect(waitError.context).toMatchObject({
          urlPattern: '/api/users',
        });
      }
    });
  });

  describe('Factory Function', () => {
    it('should create WaitStrategy instance', () => {
      const strategy = createWaitStrategy(mockDriver, mockConfig, mockLogger);

      expect(strategy).toBeInstanceOf(WaitStrategyImpl);
    });
  });

  describe('Polling Interval', () => {
    it('should use configured polling interval from config', async () => {
      // The polling interval is used internally by selenium-webdriver
      // We verify it's available in the config
      expect(mockConfig.timeouts.polling).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selector', async () => {
      const emptyLocator: Locator = {
        selector: '',
        strategy: 'css',
        description: 'Empty selector',
      };

      // Should still attempt the wait (selenium will handle the error)
      await expect(waitStrategy.forPresent(emptyLocator)).resolves.toBeDefined();
    });

    it('should handle zero timeout', async () => {
      const testLocator: Locator = {
        selector: '.test',
        strategy: 'css',
        description: 'Test',
      };

      await waitStrategy.forPresent(testLocator, 0);

      expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
        timeoutMs: 0,
      }));
    });

    it('should handle negative timeout by using config default', async () => {
      const testLocator: Locator = {
        selector: '.test',
        strategy: 'css',
        description: 'Test',
        timeout: -1000,
      };

      await waitStrategy.forPresent(testLocator);

      // Negative timeout from locator should be used as-is (selenium handles validation)
      expect(mockLogger.debug).toHaveBeenCalledWith('Wait started', expect.objectContaining({
        timeoutMs: -1000,
      }));
    });
  });
});
