/**
 * ActionHelper implementation for the UI automation framework.
 * Provides reusable methods for common UI interactions with automatic
 * wait strategies, retry logic, and comprehensive logging.
 * 
 * @module core/action-helper
 * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
 */

import { WebDriver, WebElement, By } from 'selenium-webdriver';
import type { RetryConfig } from '../types/config.types.js';
import type { Locator } from '../types/locator.types.js';
import type { StructuredLogger, ActionHelper as IActionHelper, WaitStrategy } from '../types/context.types.js';
import { ActionFailedError } from '../utils/errors.js';

/**
 * ActionHelper implementation with automatic wait strategies and retry logic.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
 */
export class ActionHelperImpl implements IActionHelper {
  private readonly driver: WebDriver;
  private readonly wait: WaitStrategy;
  private readonly logger: StructuredLogger;
  private readonly retryConfig: RetryConfig;

  constructor(
    driver: WebDriver,
    wait: WaitStrategy,
    logger: StructuredLogger,
    retryConfig: RetryConfig
  ) {
    this.driver = driver;
    this.wait = wait;
    this.logger = logger;
    this.retryConfig = retryConfig;
  }

  /**
   * Click on an element with automatic wait and retry logic.
   * 
   * @param locator - The locator for the element to click
   * @throws ActionFailedError if click fails after all retries
   * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
   */
  async click(locator: Locator): Promise<void> {
    await this.executeWithRetry('click', locator, async () => {
      const element = await this.wait.forClickable(locator);
      await this.scrollIntoViewIfNeeded(element);
      await element.click();
    });
  }

  /**
   * Type text into an element with automatic wait and retry logic.
   * 
   * @param locator - The locator for the element to type into
   * @param text - The text to type
   * @throws ActionFailedError if type fails after all retries
   * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
   */
  async type(locator: Locator, text: string): Promise<void> {
    await this.executeWithRetry('type', locator, async () => {
      const element = await this.wait.forClickable(locator);
      await this.scrollIntoViewIfNeeded(element);
      await element.sendKeys(text);
    });
  }

  /**
   * Select an option from a dropdown element.
   * 
   * @param locator - The locator for the select element
   * @param value - The value or visible text to select
   * @throws ActionFailedError if select fails after all retries
   * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
   */
  async select(locator: Locator, value: string): Promise<void> {
    await this.executeWithRetry('select', locator, async () => {
      const element = await this.wait.forClickable(locator);
      await this.scrollIntoViewIfNeeded(element);
      
      // Try to select by value first, then by visible text
      const options = await element.findElements(By.tagName('option'));
      let found = false;
      
      for (const option of options) {
        const optionValue = await option.getAttribute('value');
        const optionText = await option.getText();
        
        if (optionValue === value || optionText === value) {
          await option.click();
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Option with value or text "${value}" not found`);
      }
    });
  }

  /**
   * Hover over an element.
   * 
   * @param locator - The locator for the element to hover over
   * @throws ActionFailedError if hover fails after all retries
   * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
   */
  async hover(locator: Locator): Promise<void> {
    await this.executeWithRetry('hover', locator, async () => {
      const element = await this.wait.forVisible(locator);
      await this.scrollIntoViewIfNeeded(element);
      
      const actions = this.driver.actions({ async: true });
      await actions.move({ origin: element }).perform();
    });
  }

  /**
   * Drag an element and drop it onto a target element.
   * 
   * @param source - The locator for the element to drag
   * @param target - The locator for the drop target
   * @throws ActionFailedError if drag-drop fails after all retries
   * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
   */
  async dragDrop(source: Locator, target: Locator): Promise<void> {
    this.logActionStart('dragDrop', source.description, { target: target.description });
    
    try {
      await this.executeWithRetryInternal('dragDrop', source.description, async () => {
        const sourceElement = await this.wait.forClickable(source);
        const targetElement = await this.wait.forVisible(target);
        
        await this.scrollIntoViewIfNeeded(sourceElement);
        await this.scrollIntoViewIfNeeded(targetElement);
        
        const actions = this.driver.actions({ async: true });
        await actions.dragAndDrop(sourceElement, targetElement).perform();
      });
      
      this.logActionComplete('dragDrop', source.description, { target: target.description });
    } catch (error) {
      await this.handleActionFailure('dragDrop', source.description, error);
    }
  }

  /**
   * Scroll an element into view.
   * 
   * @param locator - The locator for the element to scroll into view
   * @throws ActionFailedError if scroll fails after all retries
   * @requirements 4.1, 4.2, 4.6
   */
  async scrollIntoView(locator: Locator): Promise<void> {
    await this.executeWithRetry('scrollIntoView', locator, async () => {
      const element = await this.wait.forPresent(locator);
      await this.driver.executeScript(
        'arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });',
        element
      );
      // Small delay to allow scroll animation to complete
      await this.sleep(100);
    });
  }

  /**
   * Clear the content of an element.
   * 
   * @param locator - The locator for the element to clear
   * @throws ActionFailedError if clear fails after all retries
   * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
   */
  async clear(locator: Locator): Promise<void> {
    await this.executeWithRetry('clear', locator, async () => {
      const element = await this.wait.forClickable(locator);
      await this.scrollIntoViewIfNeeded(element);
      await element.clear();
    });
  }

  /**
   * Get the text content of an element.
   * 
   * @param locator - The locator for the element
   * @returns The text content of the element
   * @throws ActionFailedError if getText fails after all retries
   * @requirements 4.1, 4.2, 4.3
   */
  async getText(locator: Locator): Promise<string> {
    return this.executeWithRetry('getText', locator, async () => {
      const element = await this.wait.forVisible(locator);
      return element.getText();
    });
  }

  /**
   * Get an attribute value from an element.
   * 
   * @param locator - The locator for the element
   * @param attribute - The attribute name to get
   * @returns The attribute value or null if not present
   * @throws ActionFailedError if getAttribute fails after all retries
   * @requirements 4.1, 4.2, 4.3
   */
  async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
    return this.executeWithRetry('getAttribute', locator, async () => {
      const element = await this.wait.forPresent(locator);
      return element.getAttribute(attribute);
    });
  }

  /**
   * Check if an element is displayed.
   * 
   * @param locator - The locator for the element
   * @returns True if the element is displayed, false otherwise
   * @requirements 4.1, 4.2
   */
  async isDisplayed(locator: Locator): Promise<boolean> {
    this.logActionStart('isDisplayed', locator.description);
    
    try {
      const element = await this.wait.forPresent(locator);
      const displayed = await element.isDisplayed();
      this.logActionComplete('isDisplayed', locator.description, { result: displayed });
      return displayed;
    } catch {
      this.logActionComplete('isDisplayed', locator.description, { result: false });
      return false;
    }
  }

  /**
   * Check if an element is enabled.
   * 
   * @param locator - The locator for the element
   * @returns True if the element is enabled, false otherwise
   * @requirements 4.1, 4.2
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    this.logActionStart('isEnabled', locator.description);
    
    try {
      const element = await this.wait.forPresent(locator);
      const enabled = await element.isEnabled();
      this.logActionComplete('isEnabled', locator.description, { result: enabled });
      return enabled;
    } catch {
      this.logActionComplete('isEnabled', locator.description, { result: false });
      return false;
    }
  }

  /**
   * Execute an action with retry logic and proper logging.
   * 
   * @param action - The action name for logging
   * @param locator - The locator for the element
   * @param fn - The async function to execute
   * @returns The result of the function
   * @throws ActionFailedError if all retries fail
   * @requirements 4.3, 4.5, 4.6
   */
  private async executeWithRetry<T>(
    action: string,
    locator: Locator,
    fn: () => Promise<T>
  ): Promise<T> {
    this.logActionStart(action, locator.description);
    
    try {
      const result = await this.executeWithRetryInternal(action, locator.description, fn);
      this.logActionComplete(action, locator.description);
      return result;
    } catch (error) {
      await this.handleActionFailure(action, locator.description, error);
      throw error; // This line is never reached due to handleActionFailure throwing
    }
  }

  /**
   * Internal retry logic with exponential backoff.
   * 
   * @param action - The action name for logging
   * @param elementDescription - Description of the element
   * @param fn - The async function to execute
   * @returns The result of the function
   * @throws The last error if all retries fail
   * @requirements 4.5
   */
  private async executeWithRetryInternal<T>(
    action: string,
    elementDescription: string,
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;
    let backoffMs = this.retryConfig.backoffMs;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retryConfig.maxAttempts) {
          this.logger.debug('Action failed, retrying', {
            action,
            element: elementDescription,
            attempt,
            maxAttempts: this.retryConfig.maxAttempts,
            backoffMs,
            error: lastError.message,
          });
          
          await this.sleep(backoffMs);
          backoffMs = Math.round(backoffMs * this.retryConfig.backoffMultiplier);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Scroll element into view if it's not currently interactable.
   * 
   * @param element - The WebElement to scroll into view
   * @requirements 4.6
   */
  private async scrollIntoViewIfNeeded(element: WebElement): Promise<void> {
    try {
      // Check if element is in viewport
      const isInViewport = await this.driver.executeScript<boolean>(`
        const rect = arguments[0].getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      `, element);

      if (!isInViewport) {
        await this.driver.executeScript(
          'arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });',
          element
        );
        // Small delay to allow scroll animation to complete
        await this.sleep(100);
      }
    } catch {
      // If we can't check viewport, try scrolling anyway
      await this.driver.executeScript(
        'arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });',
        element
      );
      await this.sleep(100);
    }
  }

  /**
   * Handle action failure by capturing screenshot and throwing ActionFailedError.
   * 
   * @param action - The action that failed
   * @param elementDescription - Description of the element
   * @param error - The error that occurred
   * @throws ActionFailedError with context
   * @requirements 4.4
   */
  private async handleActionFailure(
    action: string,
    elementDescription: string,
    error: unknown
  ): Promise<never> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Capture screenshot on failure
    let screenshotPath: string | undefined;
    try {
      const screenshot = await this.driver.takeScreenshot();
      screenshotPath = `screenshot-${action}-${Date.now()}.png`;
      this.logger.error('Action failed - screenshot captured', {
        action,
        element: elementDescription,
        error: errorMessage,
        screenshotBase64: screenshot.substring(0, 100) + '...', // Log truncated for brevity
        screenshotPath,
      });
    } catch (screenshotError) {
      this.logger.error('Action failed - screenshot capture failed', {
        action,
        element: elementDescription,
        error: errorMessage,
        screenshotError: screenshotError instanceof Error ? screenshotError.message : String(screenshotError),
      });
    }

    throw new ActionFailedError(action, elementDescription, errorMessage, {
      screenshotPath,
      attempts: this.retryConfig.maxAttempts,
    });
  }

  /**
   * Log action start.
   * 
   * @param action - The action name
   * @param elementDescription - Description of the element
   * @param additionalData - Additional data to log
   * @requirements 4.3
   */
  private logActionStart(
    action: string,
    elementDescription: string,
    additionalData?: Record<string, unknown>
  ): void {
    this.logger.info('Action started', {
      action,
      element: elementDescription,
      ...additionalData,
    });
  }

  /**
   * Log action completion.
   * 
   * @param action - The action name
   * @param elementDescription - Description of the element
   * @param additionalData - Additional data to log
   * @requirements 4.3
   */
  private logActionComplete(
    action: string,
    elementDescription: string,
    additionalData?: Record<string, unknown>
  ): void {
    this.logger.info('Action completed', {
      action,
      element: elementDescription,
      ...additionalData,
    });
  }

  /**
   * Sleep for a specified duration.
   * 
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create an ActionHelper instance.
 * 
 * @param driver - WebDriver instance
 * @param wait - WaitStrategy instance
 * @param logger - Structured logger
 * @param retryConfig - Retry configuration
 * @returns A new ActionHelper instance
 */
export function createActionHelper(
  driver: WebDriver,
  wait: WaitStrategy,
  logger: StructuredLogger,
  retryConfig: RetryConfig
): IActionHelper {
  return new ActionHelperImpl(driver, wait, logger, retryConfig);
}
