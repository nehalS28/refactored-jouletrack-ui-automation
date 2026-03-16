/**
 * WaitStrategy implementation for the UI automation framework.
 * Provides configurable wait mechanisms for element synchronization.
 *
 * @module core/wait-strategy
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
import { WebDriver, WebElement } from 'selenium-webdriver';
import type { FrameworkConfig } from '../types/config.types.js';
import type { Locator } from '../types/locator.types.js';
import type { StructuredLogger, WaitStrategy as IWaitStrategy } from '../types/context.types.js';
/**
 * Wait condition types for logging and error reporting.
 */
export type WaitCondition = 'visible' | 'clickable' | 'present' | 'stale' | 'networkIdle' | 'text' | 'count' | 'apiResponse' | 'animationComplete' | 'custom';
/**
 * WaitStrategy implementation with extended wait conditions.
 * Supports basic waits (visible, clickable, present, stale) and
 * extended waits (networkIdle, text, count, apiResponse, animationComplete).
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export declare class WaitStrategyImpl implements IWaitStrategy {
    private readonly driver;
    private readonly config;
    private readonly logger;
    constructor(driver: WebDriver, config: FrameworkConfig, logger: StructuredLogger);
    /**
     * Wait for element to be visible.
     *
     * @param locator - The locator for the element
     * @param timeout - Optional timeout override (milliseconds)
     * @returns The visible WebElement
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.1, 5.3, 5.4, 5.5
     */
    forVisible(locator: Locator, timeout?: number): Promise<WebElement>;
    /**
     * Wait for element to be clickable (visible and enabled).
     *
     * @param locator - The locator for the element
     * @param timeout - Optional timeout override (milliseconds)
     * @returns The clickable WebElement
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.1, 5.3, 5.4, 5.5
     */
    forClickable(locator: Locator, timeout?: number): Promise<WebElement>;
    /**
     * Wait for element to be present in DOM.
     *
     * @param locator - The locator for the element
     * @param timeout - Optional timeout override (milliseconds)
     * @returns The present WebElement
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.1, 5.3, 5.4, 5.5
     */
    forPresent(locator: Locator, timeout?: number): Promise<WebElement>;
    /**
     * Wait for element to become stale (removed from DOM).
     *
     * @param element - The WebElement to wait for staleness
     * @param timeout - Optional timeout override (milliseconds)
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.1, 5.3, 5.4, 5.5
     */
    forStale(element: WebElement, timeout?: number): Promise<void>;
    /**
     * Wait for network to be idle (no pending requests).
     *
     * @param timeout - Optional timeout override (milliseconds)
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.2, 5.3, 5.4, 5.5
     */
    forNetworkIdle(timeout?: number): Promise<void>;
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
    forText(locator: Locator, expectedText: string, timeout?: number): Promise<WebElement>;
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
    forCount(locator: Locator, expectedCount: number, timeout?: number): Promise<WebElement[]>;
    /**
     * Wait for API response matching URL pattern.
     *
     * @param urlPattern - String or RegExp pattern to match API URLs
     * @param timeout - Optional timeout override (milliseconds)
     * @returns The matching performance entry
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.2, 5.3, 5.4, 5.5
     */
    forApiResponse(urlPattern: string | RegExp, timeout?: number): Promise<unknown>;
    /**
     * Wait for CSS animations to complete on element.
     *
     * @param locator - The locator for the element
     * @param timeout - Optional timeout override (milliseconds)
     * @returns The WebElement after animations complete
     * @throws WaitTimeoutError if timeout is exceeded
     * @requirements 5.2, 5.3, 5.4, 5.5
     */
    forAnimationComplete(locator: Locator, timeout?: number): Promise<WebElement>;
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
    forCustom<T>(condition: () => Promise<T | false>, description: string, timeout?: number): Promise<T>;
    /**
     * Internal method to wait for element with specific condition.
     */
    private waitForElement;
    /**
     * Convert Locator to Selenium By.
     */
    private toSeleniumBy;
    /**
     * Apply the wait condition and return the element.
     */
    private applyCondition;
    /**
     * Log wait operation start.
     * @requirements 5.4
     */
    private logWaitStart;
    /**
     * Log wait operation completion.
     * @requirements 5.4
     */
    private logWaitCompletion;
    /**
     * Log wait operation timeout.
     * @requirements 5.4, 5.5
     */
    private logWaitTimeout;
}
/**
 * Factory function to create a WaitStrategy instance.
 *
 * @param driver - WebDriver instance
 * @param config - Framework configuration
 * @param logger - Structured logger
 * @returns A new WaitStrategy instance
 */
export declare function createWaitStrategy(driver: WebDriver, config: FrameworkConfig, logger: StructuredLogger): IWaitStrategy;
//# sourceMappingURL=wait-strategy.d.ts.map