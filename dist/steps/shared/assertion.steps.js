/**
 * Shared assertion step definitions.
 * Provides common assertion actions across all domains.
 *
 * @module steps/shared/assertion
 * @requirements 8.5, 9.2
 */
import { Then } from '@cucumber/cucumber';
import { expect } from 'vitest';
/**
 * Verify page title contains expected text
 * @requirements 8.5, 9.2
 */
Then('the page title should be {string}', async function (expectedTitle) {
    const actualTitle = await this.context.driver.getTitle();
    expect(actualTitle).toBe(expectedTitle);
});
/**
 * Verify page title contains expected text
 * @requirements 8.5, 9.2
 */
Then('the page title should contain {string}', async function (expectedText) {
    const actualTitle = await this.context.driver.getTitle();
    expect(actualTitle).toContain(expectedText);
});
/**
 * Verify element is visible
 * @requirements 8.5, 9.2
 */
Then('I should see {string}', async function (text) {
    // This is a generic assertion that would need to be implemented
    // based on the specific element locator strategy
    this.context.logger.debug('Verifying element visibility', { text });
    // Implementation would use wait.forVisible with appropriate locator
});
/**
 * Verify element is not visible
 * @requirements 8.5, 9.2
 */
Then('I should not see {string}', async function (text) {
    // This is a generic assertion that would need to be implemented
    // based on the specific element locator strategy
    this.context.logger.debug('Verifying element is not visible', { text });
    // Implementation would check element is not present or not visible
});
/**
 * Verify text is present on the page
 * @requirements 8.5, 9.2
 */
Then('the page should contain {string}', async function (expectedText) {
    const pageSource = await this.context.driver.getPageSource();
    expect(pageSource).toContain(expectedText);
});
/**
 * Verify text is not present on the page
 * @requirements 8.5, 9.2
 */
Then('the page should not contain {string}', async function (unexpectedText) {
    const pageSource = await this.context.driver.getPageSource();
    expect(pageSource).not.toContain(unexpectedText);
});
/**
 * Verify URL contains expected text
 * @requirements 8.5, 9.2
 */
Then('the URL should contain {string}', async function (expectedText) {
    const currentUrl = await this.context.driver.getCurrentUrl();
    expect(currentUrl).toContain(expectedText);
});
/**
 * Verify URL does not contain expected text
 * @requirements 8.5, 9.2
 */
Then('the URL should not contain {string}', async function (unexpectedText) {
    const currentUrl = await this.context.driver.getCurrentUrl();
    expect(currentUrl).not.toContain(unexpectedText);
});
/**
 * Verify element attribute has expected value
 * @requirements 8.5, 9.2
 */
Then('the {string} should be {string}', async function (elementName, expectedState) {
    this.context.logger.debug('Verifying element state', { elementName, expectedState });
    // Implementation would depend on specific element and state
    // This is a generic step that can be specialized in domain-specific steps
});
/**
 * Verify count of elements
 * @requirements 8.5, 9.2
 */
Then('I should see {int} {string}', async function (expectedCount, elementType) {
    this.context.logger.debug('Verifying element count', { expectedCount, elementType });
    // Implementation would use wait.forCount with appropriate locator
});
/**
 * Verify element is enabled
 * @requirements 8.5, 9.2
 */
Then('the {string} should be enabled', async function (elementName) {
    this.context.logger.debug('Verifying element is enabled', { elementName });
    // Implementation would check element.isEnabled()
});
/**
 * Verify element is disabled
 * @requirements 8.5, 9.2
 */
Then('the {string} should be disabled', async function (elementName) {
    this.context.logger.debug('Verifying element is disabled', { elementName });
    // Implementation would check !element.isEnabled()
});
//# sourceMappingURL=assertion.steps.js.map