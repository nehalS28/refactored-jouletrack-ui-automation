/**
 * WaitStrategy implementation for the UI automation framework.
 * Provides configurable wait mechanisms for element synchronization.
 * 
 * @module core/wait-strategy
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { WebDriver, WebElement, until, By } from 'selenium-webdriver';
import type { FrameworkConfig } from '../types/config.types.js';
import type { Locator } from '../types/locator.types.js';
import type { StructuredLogger, WaitStrategy as IWaitStrategy } from '../types/context.types.js';
import { WaitTimeoutError } from '../utils/errors.js';

/**
 * Wait condition types for logging and error reporting.
 */
export type WaitCondition =
  | 'visible'
  | 'clickable'
  | 'present'
  | 'stale'
  | 'networkIdle'
  | 'text'
  | 'count'
  | 'apiResponse'
  | 'animationComplete'
  | 'custom';

/**
 * WaitStrategy implementation with extended wait conditions.
 * Supports basic waits (visible, clickable, present, stale) and
 * extended waits (networkIdle, text, count, apiResponse, animationComplete).
 * 
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export class WaitStrategyImpl implements IWaitStrategy {
  private readonly driver: WebDriver;
  private readonly config: FrameworkConfig;
  private readonly logger: StructuredLogger;

  constructor(
    driver: WebDriver,
    config: FrameworkConfig,
    logger: StructuredLogger
  ) {
    this.driver = driver;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Wait for element to be visible.
   * 
   * @param locator - The locator for the element
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The visible WebElement
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.1, 5.3, 5.4, 5.5
   */
  async forVisible(locator: Locator, timeout?: number): Promise<WebElement> {
    return this.waitForElement('visible', locator, timeout);
  }

  /**
   * Wait for element to be clickable (visible and enabled).
   * 
   * @param locator - The locator for the element
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The clickable WebElement
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.1, 5.3, 5.4, 5.5
   */
  async forClickable(locator: Locator, timeout?: number): Promise<WebElement> {
    return this.waitForElement('clickable', locator, timeout);
  }

  /**
   * Wait for element to be present in DOM.
   * 
   * @param locator - The locator for the element
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The present WebElement
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.1, 5.3, 5.4, 5.5
   */
  async forPresent(locator: Locator, timeout?: number): Promise<WebElement> {
    return this.waitForElement('present', locator, timeout);
  }

  /**
   * Wait for element to become stale (removed from DOM).
   * 
   * @param element - The WebElement to wait for staleness
   * @param timeout - Optional timeout override (milliseconds)
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.1, 5.3, 5.4, 5.5
   */
  async forStale(element: WebElement, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
    const startTime = Date.now();

    this.logWaitStart('stale', effectiveTimeout);

    try {
      await this.driver.wait(until.stalenessOf(element), effectiveTimeout);
      this.logWaitCompletion('stale', effectiveTimeout, Date.now() - startTime);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout('stale', effectiveTimeout, duration);
      throw new WaitTimeoutError('stale', effectiveTimeout, undefined, {
        actualDuration: duration,
      });
    }
  }

  /**
   * Wait for network to be idle (no pending requests).
   * 
   * @param timeout - Optional timeout override (milliseconds)
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.2, 5.3, 5.4, 5.5
   */
  async forNetworkIdle(timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
    const startTime = Date.now();

    this.logWaitStart('networkIdle', effectiveTimeout);

    try {
      await this.driver.wait(async () => {
        const pendingRequests = await this.driver.executeScript<number>(`
          return window.performance.getEntriesByType('resource')
            .filter(r => !r.responseEnd).length;
        `);
        return pendingRequests === 0;
      }, effectiveTimeout, 'Network idle');

      this.logWaitCompletion('networkIdle', effectiveTimeout, Date.now() - startTime);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout('networkIdle', effectiveTimeout, duration);
      throw new WaitTimeoutError('networkIdle', effectiveTimeout, undefined, {
        actualDuration: duration,
      });
    }
  }

  /**
   * Wait for element to contain specific text.
   * 
   * @param locator - The locator for the element
   * @param expectedText - The text to wait for
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The WebElement containing the text
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.2, 5.3, 5.4, 5.5
   */
  async forText(
    locator: Locator,
    expectedText: string,
    timeout?: number
  ): Promise<WebElement> {
    const effectiveTimeout = timeout ?? locator.timeout ?? this.config.timeouts.explicit;
    const by = this.toSeleniumBy(locator);
    const startTime = Date.now();
    const conditionDesc = `text:${expectedText}`;

    this.logWaitStart(conditionDesc, effectiveTimeout, locator.description);

    try {
      const element = await this.driver.wait(async () => {
        try {
          const el = await this.driver.findElement(by);
          const text = await el.getText();
          return text.includes(expectedText) ? el : false;
        } catch {
          return false;
        }
      }, effectiveTimeout, `Text "${expectedText}" in element`);

      this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime, locator.description);
      return element as WebElement;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout(conditionDesc, effectiveTimeout, duration, locator.description);
      throw new WaitTimeoutError(conditionDesc, effectiveTimeout, locator.description, {
        expectedText,
        actualDuration: duration,
      });
    }
  }

  /**
   * Wait for specific number of elements matching locator.
   * 
   * @param locator - The locator for the elements
   * @param expectedCount - The expected number of elements
   * @param timeout - Optional timeout override (milliseconds)
   * @returns Array of WebElements matching the count
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.2, 5.3, 5.4, 5.5
   */
  async forCount(
    locator: Locator,
    expectedCount: number,
    timeout?: number
  ): Promise<WebElement[]> {
    const effectiveTimeout = timeout ?? locator.timeout ?? this.config.timeouts.explicit;
    const by = this.toSeleniumBy(locator);
    const startTime = Date.now();
    const conditionDesc = `count:${expectedCount}`;

    this.logWaitStart(conditionDesc, effectiveTimeout, locator.description);

    try {
      const elements = await this.driver.wait(async () => {
        const found = await this.driver.findElements(by);
        return found.length === expectedCount ? found : false;
      }, effectiveTimeout, `${expectedCount} elements`);

      this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime, locator.description);
      return elements as WebElement[];
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout(conditionDesc, effectiveTimeout, duration, locator.description);
      throw new WaitTimeoutError(conditionDesc, effectiveTimeout, locator.description, {
        expectedCount,
        actualDuration: duration,
      });
    }
  }

  /**
   * Wait for API response matching URL pattern.
   * 
   * @param urlPattern - String or RegExp pattern to match API URLs
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The matching performance entry
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.2, 5.3, 5.4, 5.5
   */
  async forApiResponse(urlPattern: string | RegExp, timeout?: number): Promise<unknown> {
    const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
    const startTime = Date.now();
    const patternStr = urlPattern instanceof RegExp ? urlPattern.source : urlPattern;
    const conditionDesc = `apiResponse:${patternStr}`;

    this.logWaitStart(conditionDesc, effectiveTimeout);

    try {
      const response = await this.driver.wait(async () => {
        const entries = await this.driver.executeScript<Array<{ name: string; duration: number; responseEnd: number }>>(`
          return window.performance.getEntriesByType('resource')
            .filter(r => r.responseEnd > 0)
            .map(r => ({ name: r.name, duration: r.duration, responseEnd: r.responseEnd }));
        `);

        const pattern = typeof urlPattern === 'string'
          ? new RegExp(urlPattern)
          : urlPattern;

        return entries.find(e => pattern.test(e.name)) || false;
      }, effectiveTimeout, `API response matching ${patternStr}`);

      this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime);
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout(conditionDesc, effectiveTimeout, duration);
      throw new WaitTimeoutError(conditionDesc, effectiveTimeout, undefined, {
        urlPattern: patternStr,
        actualDuration: duration,
      });
    }
  }

  /**
   * Wait for CSS animations to complete on element.
   * 
   * @param locator - The locator for the element
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The WebElement after animations complete
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.2, 5.3, 5.4, 5.5
   */
  async forAnimationComplete(locator: Locator, timeout?: number): Promise<WebElement> {
    const effectiveTimeout = timeout ?? locator.timeout ?? this.config.timeouts.explicit;
    const by = this.toSeleniumBy(locator);
    const startTime = Date.now();
    const conditionDesc = 'animationComplete';

    this.logWaitStart(conditionDesc, effectiveTimeout, locator.description);

    try {
      // First wait for element to be present
      const element = await this.driver.wait(until.elementLocated(by), effectiveTimeout);

      // Then wait for animations to complete
      await this.driver.wait(async () => {
        const animations = await this.driver.executeScript<number>(`
          const el = arguments[0];
          return el.getAnimations ? el.getAnimations().length : 0;
        `, element);
        return animations === 0;
      }, effectiveTimeout, 'Animation complete');

      this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime, locator.description);
      return element;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout(conditionDesc, effectiveTimeout, duration, locator.description);
      throw new WaitTimeoutError(conditionDesc, effectiveTimeout, locator.description, {
        actualDuration: duration,
      });
    }
  }

  /**
   * Wait for custom condition with predicate function.
   * 
   * @param condition - Async predicate function returning value or false
   * @param description - Human-readable description of the condition
   * @param timeout - Optional timeout override (milliseconds)
   * @returns The value returned by the condition when truthy
   * @throws WaitTimeoutError if timeout is exceeded
   * @requirements 5.2, 5.3, 5.4, 5.5
   */
  async forCustom<T>(
    condition: () => Promise<T | false>,
    description: string,
    timeout?: number
  ): Promise<T> {
    const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
    const startTime = Date.now();
    const conditionDesc = `custom:${description}`;

    this.logWaitStart(conditionDesc, effectiveTimeout);

    try {
      const result = await this.driver.wait(async () => {
        try {
          return await condition();
        } catch {
          return false;
        }
      }, effectiveTimeout, description);

      this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime);
      return result as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout(conditionDesc, effectiveTimeout, duration);
      throw new WaitTimeoutError(conditionDesc, effectiveTimeout, undefined, {
        description,
        actualDuration: duration,
      });
    }
  }

  /**
   * Internal method to wait for element with specific condition.
   */
  private async waitForElement(
    condition: 'visible' | 'clickable' | 'present',
    locator: Locator,
    timeout?: number
  ): Promise<WebElement> {
    const effectiveTimeout = timeout ?? locator.timeout ?? this.config.timeouts.explicit;
    const by = this.toSeleniumBy(locator);
    const startTime = Date.now();

    this.logWaitStart(condition, effectiveTimeout, locator.description);

    try {
      const element = await this.applyCondition(condition, by, effectiveTimeout);
      this.logWaitCompletion(condition, effectiveTimeout, Date.now() - startTime, locator.description);
      return element;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logWaitTimeout(condition, effectiveTimeout, duration, locator.description);
      throw new WaitTimeoutError(condition, effectiveTimeout, locator.description, {
        selector: locator.selector,
        strategy: locator.strategy,
        actualDuration: duration,
      });
    }
  }

  /**
   * Convert Locator to Selenium By.
   */
  private toSeleniumBy(locator: Locator): By {
    switch (locator.strategy) {
      case 'css':
      case 'data-testid':
        return By.css(locator.selector);
      case 'xpath':
        return By.xpath(locator.selector);
      case 'aria-label':
        // For aria-label, we need to escape quotes in the selector
        const escapedSelector = locator.selector.replace(/"/g, '\\"');
        return By.css(`[aria-label="${escapedSelector}"]`);
      default:
        return By.css(locator.selector);
    }
  }

  /**
   * Apply the wait condition and return the element.
   */
  private async applyCondition(
    condition: 'visible' | 'clickable' | 'present',
    by: By,
    timeout: number
  ): Promise<WebElement> {
    switch (condition) {
      case 'visible': {
        const element = await this.driver.wait(until.elementLocated(by), timeout);
        return this.driver.wait(until.elementIsVisible(element), timeout);
      }
      case 'clickable': {
        const element = await this.driver.wait(until.elementLocated(by), timeout);
        await this.driver.wait(until.elementIsVisible(element), timeout);
        return this.driver.wait(until.elementIsEnabled(element), timeout);
      }
      case 'present':
        return this.driver.wait(until.elementLocated(by), timeout);
      default:
        return this.driver.wait(until.elementLocated(by), timeout);
    }
  }

  /**
   * Log wait operation start.
   * @requirements 5.4
   */
  private logWaitStart(
    condition: string,
    timeout: number,
    locatorDescription?: string
  ): void {
    this.logger.debug('Wait started', {
      condition,
      timeoutMs: timeout,
      ...(locatorDescription && { element: locatorDescription }),
    });
  }

  /**
   * Log wait operation completion.
   * @requirements 5.4
   */
  private logWaitCompletion(
    condition: string,
    timeout: number,
    actualMs: number,
    locatorDescription?: string
  ): void {
    const efficiency = ((timeout - actualMs) / timeout * 100).toFixed(1);
    this.logger.debug('Wait completed', {
      condition,
      configuredMs: timeout,
      actualMs,
      efficiency: `${efficiency}%`,
      ...(locatorDescription && { element: locatorDescription }),
    });
  }

  /**
   * Log wait operation timeout.
   * @requirements 5.4, 5.5
   */
  private logWaitTimeout(
    condition: string,
    timeout: number,
    actualMs: number,
    locatorDescription?: string
  ): void {
    this.logger.warn('Wait timeout', {
      condition,
      configuredMs: timeout,
      actualMs,
      ...(locatorDescription && { element: locatorDescription }),
    });
  }
}

/**
 * Factory function to create a WaitStrategy instance.
 * 
 * @param driver - WebDriver instance
 * @param config - Framework configuration
 * @param logger - Structured logger
 * @returns A new WaitStrategy instance
 */
export function createWaitStrategy(
  driver: WebDriver,
  config: FrameworkConfig,
  logger: StructuredLogger
): IWaitStrategy {
  return new WaitStrategyImpl(driver, config, logger);
}
