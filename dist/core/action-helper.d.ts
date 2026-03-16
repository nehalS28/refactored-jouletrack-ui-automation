/**
 * ActionHelper implementation for the UI automation framework.
 * Provides reusable methods for common UI interactions with automatic
 * wait strategies, retry logic, and comprehensive logging.
 *
 * @module core/action-helper
 * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
 */
import { WebDriver } from 'selenium-webdriver';
import type { RetryConfig } from '../types/config.types.js';
import type { Locator } from '../types/locator.types.js';
import type { StructuredLogger, ActionHelper as IActionHelper, WaitStrategy } from '../types/context.types.js';
/**
 * ActionHelper implementation with automatic wait strategies and retry logic.
 *
 * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
 */
export declare class ActionHelperImpl implements IActionHelper {
    private readonly driver;
    private readonly wait;
    private readonly logger;
    private readonly retryConfig;
    constructor(driver: WebDriver, wait: WaitStrategy, logger: StructuredLogger, retryConfig: RetryConfig);
    /**
     * Click on an element with automatic wait and retry logic.
     *
     * @param locator - The locator for the element to click
     * @throws ActionFailedError if click fails after all retries
     * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
     */
    click(locator: Locator): Promise<void>;
    /**
     * Type text into an element with automatic wait and retry logic.
     *
     * @param locator - The locator for the element to type into
     * @param text - The text to type
     * @throws ActionFailedError if type fails after all retries
     * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
     */
    type(locator: Locator, text: string): Promise<void>;
    /**
     * Select an option from a dropdown element.
     *
     * @param locator - The locator for the select element
     * @param value - The value or visible text to select
     * @throws ActionFailedError if select fails after all retries
     * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
     */
    select(locator: Locator, value: string): Promise<void>;
    /**
     * Hover over an element.
     *
     * @param locator - The locator for the element to hover over
     * @throws ActionFailedError if hover fails after all retries
     * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
     */
    hover(locator: Locator): Promise<void>;
    /**
     * Drag an element and drop it onto a target element.
     *
     * @param source - The locator for the element to drag
     * @param target - The locator for the drop target
     * @throws ActionFailedError if drag-drop fails after all retries
     * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
     */
    dragDrop(source: Locator, target: Locator): Promise<void>;
    /**
     * Scroll an element into view.
     *
     * @param locator - The locator for the element to scroll into view
     * @throws ActionFailedError if scroll fails after all retries
     * @requirements 4.1, 4.2, 4.6
     */
    scrollIntoView(locator: Locator): Promise<void>;
    /**
     * Clear the content of an element.
     *
     * @param locator - The locator for the element to clear
     * @throws ActionFailedError if clear fails after all retries
     * @requirements 4.1, 4.2, 4.3, 4.5, 4.6
     */
    clear(locator: Locator): Promise<void>;
    /**
     * Get the text content of an element.
     *
     * @param locator - The locator for the element
     * @returns The text content of the element
     * @throws ActionFailedError if getText fails after all retries
     * @requirements 4.1, 4.2, 4.3
     */
    getText(locator: Locator): Promise<string>;
    /**
     * Get an attribute value from an element.
     *
     * @param locator - The locator for the element
     * @param attribute - The attribute name to get
     * @returns The attribute value or null if not present
     * @throws ActionFailedError if getAttribute fails after all retries
     * @requirements 4.1, 4.2, 4.3
     */
    getAttribute(locator: Locator, attribute: string): Promise<string | null>;
    /**
     * Check if an element is displayed.
     *
     * @param locator - The locator for the element
     * @returns True if the element is displayed, false otherwise
     * @requirements 4.1, 4.2
     */
    isDisplayed(locator: Locator): Promise<boolean>;
    /**
     * Check if an element is enabled.
     *
     * @param locator - The locator for the element
     * @returns True if the element is enabled, false otherwise
     * @requirements 4.1, 4.2
     */
    isEnabled(locator: Locator): Promise<boolean>;
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
    private executeWithRetry;
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
    private executeWithRetryInternal;
    /**
     * Scroll element into view if it's not currently interactable.
     *
     * @param element - The WebElement to scroll into view
     * @requirements 4.6
     */
    private scrollIntoViewIfNeeded;
    /**
     * Handle action failure by capturing screenshot and throwing ActionFailedError.
     *
     * @param action - The action that failed
     * @param elementDescription - Description of the element
     * @param error - The error that occurred
     * @throws ActionFailedError with context
     * @requirements 4.4
     */
    private handleActionFailure;
    /**
     * Log action start.
     *
     * @param action - The action name
     * @param elementDescription - Description of the element
     * @param additionalData - Additional data to log
     * @requirements 4.3
     */
    private logActionStart;
    /**
     * Log action completion.
     *
     * @param action - The action name
     * @param elementDescription - Description of the element
     * @param additionalData - Additional data to log
     * @requirements 4.3
     */
    private logActionComplete;
    /**
     * Sleep for a specified duration.
     *
     * @param ms - Duration in milliseconds
     */
    private sleep;
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
export declare function createActionHelper(driver: WebDriver, wait: WaitStrategy, logger: StructuredLogger, retryConfig: RetryConfig): IActionHelper;
//# sourceMappingURL=action-helper.d.ts.map