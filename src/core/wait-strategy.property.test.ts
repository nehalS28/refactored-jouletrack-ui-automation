/**
 * Property-based tests for Extended Wait Conditions.
 * 
 * **Property 56: Extended Wait Conditions**
 * **Validates: Requirements 5.1, 5.2**
 * 
 * Tests that all wait conditions correctly evaluate and timeout:
 * - forVisible, forClickable, forPresent, forStale
 * - forNetworkIdle, forText, forCount, forApiResponse, forAnimationComplete
 * - forCustom with predicate functions
 * 
 * @module core/wait-strategy.property.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { WebDriver, WebElement, By } from 'selenium-webdriver';
import { WaitStrategyImpl } from './wait-strategy.js';
import type { FrameworkConfig } from '../types/config.types.js';
import type { Locator, LocatorStrategy } from '../types/locator.types.js';
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

/**
 * Arbitrary for generating valid locator strategies.
 */
const locatorStrategyArb: fc.Arbitrary<LocatorStrategy> = fc.constantFrom(
  'css', 'data-testid', 'xpath', 'aria-label'
);

/**
 * Arbitrary for generating valid CSS selectors.
 */
const cssSelectorArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 30 })
    .filter(s => /^[a-zA-Z]/.test(s))
    .map(s => `.${s.replace(/[^a-zA-Z0-9-_]/g, '-')}`),
  fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z]/.test(s))
    .map(s => `#${s.replace(/[^a-zA-Z0-9-_]/g, '-')}`),
  fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z]/.test(s))
    .map(s => `[data-testid='${s.replace(/[^a-zA-Z0-9-_]/g, '-')}']`)
);

/**
 * Arbitrary for generating valid XPath selectors.
 */
const xpathSelectorArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z]/.test(s))
  .map(s => `//div[@class="${s.replace(/[^a-zA-Z0-9-_]/g, '-')}"]`);

/**
 * Arbitrary for generating valid ARIA label selectors.
 */
const ariaLabelSelectorArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-zA-Z]/.test(s) && !s.includes('"'))
  .map(s => s.replace(/[^a-zA-Z0-9 -]/g, ' ').trim());

/**
 * Arbitrary for generating valid locators based on strategy.
 */
const locatorArb: fc.Arbitrary<Locator> = fc.record({
  strategy: locatorStrategyArb,
  description: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  timeout: fc.option(fc.integer({ min: 100, max: 30000 }), { nil: undefined }),
}).chain(({ strategy, description, timeout }) => {
  const selectorArb = strategy === 'xpath' 
    ? xpathSelectorArb 
    : strategy === 'aria-label'
      ? ariaLabelSelectorArb
      : cssSelectorArb;
  
  return selectorArb.map(selector => ({
    selector: strategy === 'aria-label' ? selector : selector,
    strategy,
    description,
    timeout,
  }));
});

/**
 * Arbitrary for generating positive timeout values.
 */
const timeoutArb = fc.integer({ min: 50, max: 5000 });

/**
 * Arbitrary for generating expected text content.
 */
const expectedTextArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generating expected element counts.
 */
const expectedCountArb = fc.integer({ min: 0, max: 100 });

/**
 * Arbitrary for generating URL patterns.
 */
const urlPatternArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 30 })
    .filter(s => /^[a-zA-Z]/.test(s))
    .map(s => `/api/${s.replace(/[^a-zA-Z0-9/-]/g, '-')}`),
  fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z]/.test(s))
    .map(s => new RegExp(`/api/${s.replace(/[^a-zA-Z0-9]/g, '')}.*`))
);

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

/**
 * Create a mock WebElement for testing.
 */
function createMockElement(overrides: Partial<WebElement> = {}): WebElement {
  return {
    getText: vi.fn().mockResolvedValue('Test text'),
    getAnimations: vi.fn().mockReturnValue([]),
    isDisplayed: vi.fn().mockResolvedValue(true),
    isEnabled: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as WebElement;
}

describe('Property 56: Extended Wait Conditions', () => {
  let mockDriver: WebDriver;
  let mockLogger: StructuredLogger;
  let mockConfig: FrameworkConfig;
  let mockElement: WebElement;

  beforeEach(() => {
    mockElement = createMockElement();
    mockLogger = createMockLogger();
    mockConfig = createTestConfig();

    mockDriver = {
      wait: vi.fn().mockResolvedValue(mockElement),
      findElement: vi.fn().mockResolvedValue(mockElement),
      findElements: vi.fn().mockResolvedValue([mockElement]),
      executeScript: vi.fn().mockResolvedValue(0),
    } as unknown as WebDriver;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Wait Conditions (forVisible, forClickable, forPresent)', () => {
    it('should throw WaitTimeoutError with correct context when timeout is exceeded', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          timeoutArb,
          async (locator, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forVisible(locator, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe('visible');
              expect(waitError.timeoutMs).toBe(timeout);
              expect(waitError.locatorDescription).toBe(locator.description);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return element when condition is met for any valid locator', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          async (locator) => {
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forVisible(locator);
            expect(result).toBe(mockElement);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should use locator timeout when specified, otherwise use provided timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          fc.option(timeoutArb, { nil: undefined }),
          async (locator, providedTimeout) => {
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            await waitStrategy.forPresent(locator, providedTimeout);

            const expectedTimeout = providedTimeout ?? locator.timeout ?? mockConfig.timeouts.explicit;
            expect(mockLogger.debug).toHaveBeenCalledWith(
              'Wait started',
              expect.objectContaining({ timeoutMs: expectedTimeout })
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should log wait completion with timing information for all basic conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          fc.constantFrom('forVisible', 'forClickable', 'forPresent') as fc.Arbitrary<'forVisible' | 'forClickable' | 'forPresent'>,
          async (locator, method) => {
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            await waitStrategy[method](locator);

            expect(mockLogger.debug).toHaveBeenCalledWith(
              'Wait completed',
              expect.objectContaining({
                actualMs: expect.any(Number),
                efficiency: expect.stringMatching(/^\d+\.\d+%$/),
              })
            );
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('forStale Wait Condition', () => {
    it('should throw WaitTimeoutError when element does not become stale', async () => {
      await fc.assert(
        fc.asyncProperty(
          timeoutArb,
          async (timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forStale(mockElement, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe('stale');
              expect(waitError.timeoutMs).toBe(timeout);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should complete successfully when element becomes stale', async () => {
      await fc.assert(
        fc.asyncProperty(
          timeoutArb,
          async (timeout) => {
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            await expect(waitStrategy.forStale(mockElement, timeout)).resolves.toBeUndefined();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Extended Wait: forNetworkIdle', () => {
    it('should throw WaitTimeoutError when network does not become idle', async () => {
      await fc.assert(
        fc.asyncProperty(
          timeoutArb,
          async (timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forNetworkIdle(timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe('networkIdle');
              expect(waitError.timeoutMs).toBe(timeout);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should complete when network is idle (no pending requests)', async () => {
      await fc.assert(
        fc.asyncProperty(
          timeoutArb,
          async (timeout) => {
            vi.mocked(mockDriver.executeScript).mockResolvedValue(0);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return true;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            await expect(waitStrategy.forNetworkIdle(timeout)).resolves.toBeUndefined();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Extended Wait: forText', () => {
    it('should throw WaitTimeoutError with expected text in context when text not found', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          expectedTextArb,
          timeoutArb,
          async (locator, expectedText, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forText(locator, expectedText, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe(`text:${expectedText}`);
              expect(waitError.context).toMatchObject({ expectedText });
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should return element when text is found', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          expectedTextArb,
          async (locator, expectedText) => {
            vi.mocked(mockElement.getText).mockResolvedValue(`Contains ${expectedText} in text`);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return mockElement;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forText(locator, expectedText);
            expect(result).toBe(mockElement);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Extended Wait: forCount', () => {
    it('should throw WaitTimeoutError with expected count in context when count not matched', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          expectedCountArb,
          timeoutArb,
          async (locator, expectedCount, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forCount(locator, expectedCount, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe(`count:${expectedCount}`);
              expect(waitError.context).toMatchObject({ expectedCount });
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should return elements when count matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          fc.integer({ min: 1, max: 10 }),
          async (locator, expectedCount) => {
            const mockElements = Array(expectedCount).fill(null).map(() => createMockElement());
            vi.mocked(mockDriver.findElements).mockResolvedValue(mockElements);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return mockElements;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forCount(locator, expectedCount);
            expect(result).toHaveLength(expectedCount);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Extended Wait: forApiResponse', () => {
    it('should throw WaitTimeoutError with URL pattern in context when API response not found', async () => {
      await fc.assert(
        fc.asyncProperty(
          urlPatternArb,
          timeoutArb,
          async (urlPattern, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forApiResponse(urlPattern, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              const patternStr = urlPattern instanceof RegExp ? urlPattern.source : urlPattern;
              expect(waitError.condition).toBe(`apiResponse:${patternStr}`);
              expect(waitError.context).toMatchObject({ urlPattern: patternStr });
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should return performance entry when API response matches string pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter(s => /^[a-zA-Z]/.test(s))
            .map(s => `/api/${s.replace(/[^a-zA-Z0-9/-]/g, '-')}`),
          async (urlPattern) => {
            const mockEntry = { name: `https://example.com${urlPattern}`, duration: 100, responseEnd: 150 };
            vi.mocked(mockDriver.executeScript).mockResolvedValue([mockEntry]);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return mockEntry;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forApiResponse(urlPattern);
            expect(result).toEqual(mockEntry);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should return performance entry when API response matches RegExp pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 15 })
            .filter(s => /^[a-zA-Z]/.test(s))
            .map(s => new RegExp(`/api/${s.replace(/[^a-zA-Z0-9]/g, '')}.*`)),
          async (urlPattern) => {
            const mockEntry = { name: `https://example.com/api/test123`, duration: 100, responseEnd: 150 };
            vi.mocked(mockDriver.executeScript).mockResolvedValue([mockEntry]);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return mockEntry;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forApiResponse(urlPattern);
            expect(result).toBeDefined();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Extended Wait: forAnimationComplete', () => {
    it('should throw WaitTimeoutError when animations do not complete', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          timeoutArb,
          async (locator, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forAnimationComplete(locator, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe('animationComplete');
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should return element when animations complete', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          async (locator) => {
            vi.mocked(mockDriver.executeScript).mockResolvedValue(0);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return mockElement;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forAnimationComplete(locator);
            expect(result).toBe(mockElement);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Custom Wait: forCustom', () => {
    it('should throw WaitTimeoutError when custom condition never becomes truthy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          timeoutArb,
          async (description, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const alwaysFalseCondition = vi.fn().mockResolvedValue(false);

            try {
              await waitStrategy.forCustom(alwaysFalseCondition, description, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.condition).toBe(`custom:${description}`);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should return result when custom condition becomes truthy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          fc.anything().filter(v => v !== false && v !== null && v !== undefined),
          async (description, expectedResult) => {
            const customCondition = vi.fn().mockResolvedValue(expectedResult);
            vi.mocked(mockDriver.wait).mockImplementation(async (condition) => {
              if (typeof condition === 'function') {
                return await condition(mockDriver);
              }
              return expectedResult;
            });

            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            const result = await waitStrategy.forCustom(customCondition, description);
            expect(result).toEqual(expectedResult);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should handle condition throwing errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          timeoutArb,
          async (description, timeout) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const errorCondition = vi.fn().mockRejectedValue(new Error('Condition error'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy.forCustom(errorCondition, description, timeout);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Error Context Completeness', () => {
    it('should include locator details in error context for element-based waits', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          fc.constantFrom('forVisible', 'forClickable', 'forPresent') as fc.Arbitrary<'forVisible' | 'forClickable' | 'forPresent'>,
          async (locator, method) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy[method](locator);
              throw new Error('Should have thrown WaitTimeoutError');
            } catch (error) {
              if (error instanceof Error && error.message === 'Should have thrown WaitTimeoutError') {
                throw error;
              }
              expect(error).toBeInstanceOf(WaitTimeoutError);
              const waitError = error as WaitTimeoutError;
              expect(waitError.context).toMatchObject({
                selector: locator.selector,
                strategy: locator.strategy,
              });
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Timeout Behavior', () => {
    it('should use config default timeout when no timeout is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb.map(l => ({ ...l, timeout: undefined })),
          async (locator) => {
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            await waitStrategy.forVisible(locator);

            expect(mockLogger.debug).toHaveBeenCalledWith(
              'Wait started',
              expect.objectContaining({ timeoutMs: mockConfig.timeouts.explicit })
            );
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should log warning on timeout for all wait conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          fc.constantFrom('forVisible', 'forClickable', 'forPresent') as fc.Arbitrary<'forVisible' | 'forClickable' | 'forPresent'>,
          async (locator, method) => {
            vi.mocked(mockDriver.wait).mockRejectedValue(new Error('Timeout'));
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);

            try {
              await waitStrategy[method](locator);
            } catch {
              // Expected to throw
            }

            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Wait timeout',
              expect.objectContaining({
                element: locator.description,
              })
            );
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Locator Strategy Conversion', () => {
    it('should correctly convert all locator strategies to Selenium By', async () => {
      await fc.assert(
        fc.asyncProperty(
          locatorArb,
          async (locator) => {
            const waitStrategy = new WaitStrategyImpl(mockDriver, mockConfig, mockLogger);
            await waitStrategy.forPresent(locator);

            if (locator.strategy === 'xpath') {
              expect(By.xpath).toHaveBeenCalledWith(locator.selector);
            } else if (locator.strategy === 'aria-label') {
              const escapedSelector = locator.selector.replace(/"/g, '\\"');
              expect(By.css).toHaveBeenCalledWith(`[aria-label="${escapedSelector}"]`);
            } else {
              expect(By.css).toHaveBeenCalledWith(locator.selector);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
