/**
 * WaitStrategy implementation for the UI automation framework.
 * Provides configurable wait mechanisms for element synchronization.
 *
 * @module core/wait-strategy
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
import { until, By } from 'selenium-webdriver';
import { WaitTimeoutError } from '../utils/errors.js';
/**
 * WaitStrategy implementation with extended wait conditions.
 * Supports basic waits (visible, clickable, present, stale) and
 * extended waits (networkIdle, text, count, apiResponse, animationComplete).
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export class WaitStrategyImpl {
    driver;
    config;
    logger;
    constructor(driver, config, logger) {
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
    async forVisible(locator, timeout) {
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
    async forClickable(locator, timeout) {
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
    async forPresent(locator, timeout) {
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
    async forStale(element, timeout) {
        const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
        const startTime = Date.now();
        this.logWaitStart('stale', effectiveTimeout);
        try {
            await this.driver.wait(until.stalenessOf(element), effectiveTimeout);
            this.logWaitCompletion('stale', effectiveTimeout, Date.now() - startTime);
        }
        catch (error) {
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
    async forNetworkIdle(timeout) {
        const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
        const startTime = Date.now();
        this.logWaitStart('networkIdle', effectiveTimeout);
        try {
            await this.driver.wait(async () => {
                const pendingRequests = await this.driver.executeScript(`
          return window.performance.getEntriesByType('resource')
            .filter(r => !r.responseEnd).length;
        `);
                return pendingRequests === 0;
            }, effectiveTimeout, 'Network idle');
            this.logWaitCompletion('networkIdle', effectiveTimeout, Date.now() - startTime);
        }
        catch (error) {
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
    async forText(locator, expectedText, timeout) {
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
                }
                catch {
                    return false;
                }
            }, effectiveTimeout, `Text "${expectedText}" in element`);
            this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime, locator.description);
            return element;
        }
        catch (error) {
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
    async forCount(locator, expectedCount, timeout) {
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
            return elements;
        }
        catch (error) {
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
    async forApiResponse(urlPattern, timeout) {
        const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
        const startTime = Date.now();
        const patternStr = urlPattern instanceof RegExp ? urlPattern.source : urlPattern;
        const conditionDesc = `apiResponse:${patternStr}`;
        this.logWaitStart(conditionDesc, effectiveTimeout);
        try {
            const response = await this.driver.wait(async () => {
                const entries = await this.driver.executeScript(`
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
        }
        catch (error) {
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
    async forAnimationComplete(locator, timeout) {
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
                const animations = await this.driver.executeScript(`
          const el = arguments[0];
          return el.getAnimations ? el.getAnimations().length : 0;
        `, element);
                return animations === 0;
            }, effectiveTimeout, 'Animation complete');
            this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime, locator.description);
            return element;
        }
        catch (error) {
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
    async forCustom(condition, description, timeout) {
        const effectiveTimeout = timeout ?? this.config.timeouts.explicit;
        const startTime = Date.now();
        const conditionDesc = `custom:${description}`;
        this.logWaitStart(conditionDesc, effectiveTimeout);
        try {
            const result = await this.driver.wait(async () => {
                try {
                    return await condition();
                }
                catch {
                    return false;
                }
            }, effectiveTimeout, description);
            this.logWaitCompletion(conditionDesc, effectiveTimeout, Date.now() - startTime);
            return result;
        }
        catch (error) {
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
    async waitForElement(condition, locator, timeout) {
        const effectiveTimeout = timeout ?? locator.timeout ?? this.config.timeouts.explicit;
        const by = this.toSeleniumBy(locator);
        const startTime = Date.now();
        this.logWaitStart(condition, effectiveTimeout, locator.description);
        try {
            const element = await this.applyCondition(condition, by, effectiveTimeout);
            this.logWaitCompletion(condition, effectiveTimeout, Date.now() - startTime, locator.description);
            return element;
        }
        catch (error) {
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
    toSeleniumBy(locator) {
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
    async applyCondition(condition, by, timeout) {
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
    logWaitStart(condition, timeout, locatorDescription) {
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
    logWaitCompletion(condition, timeout, actualMs, locatorDescription) {
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
    logWaitTimeout(condition, timeout, actualMs, locatorDescription) {
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
export function createWaitStrategy(driver, config, logger) {
    return new WaitStrategyImpl(driver, config, logger);
}
//# sourceMappingURL=wait-strategy.js.map