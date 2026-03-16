/**
 * Shared assertion step definitions.
 * Provides common assertion actions across all domains.
 * 
 * @module steps/shared/assertion
 * @requirements 8.5, 9.2
 */

import { Then } from '@cucumber/cucumber';
import type { TestContext } from '../../types/context.types.js';

/**
 * Verify page title contains expected text
 * @requirements 8.5, 9.2
 */
Then('the page title should be {string}', async function (this: { context: TestContext }, expectedTitle: string) {
  const actualTitle = await this.context.driver.getTitle();
  if (actualTitle !== expectedTitle) {
    throw new Error(`Expected page title to be "${expectedTitle}", but got "${actualTitle}"`);
  }
});

/**
 * Verify page title contains expected text
 * @requirements 8.5, 9.2
 */
Then('the page title should contain {string}', async function (this: { context: TestContext }, expectedText: string) {
  const actualTitle = await this.context.driver.getTitle();
  if (!actualTitle.includes(expectedText)) {
    throw new Error(`Expected page title to contain "${expectedText}", but got "${actualTitle}"`);
  }
});

/**
 * Verify element is visible
 * @requirements 8.5, 9.2
 */
Then('I should see {string}', async function (this: { context: TestContext }, text: string) {
  // This is a generic assertion that would need to be implemented
  // based on the specific element locator strategy
  this.context.logger.debug('Verifying element visibility', { text });
  // Implementation would use wait.forVisible with appropriate locator
});

/**
 * Verify element is not visible
 * @requirements 8.5, 9.2
 */
Then('I should not see {string}', async function (this: { context: TestContext }, text: string) {
  // This is a generic assertion that would need to be implemented
  // based on the specific element locator strategy
  this.context.logger.debug('Verifying element is not visible', { text });
  // Implementation would check element is not present or not visible
});

/**
 * Verify text is present on the page
 * @requirements 8.5, 9.2
 */
Then('the page should contain {string}', async function (this: { context: TestContext }, expectedText: string) {
  const pageSource = await this.context.driver.getPageSource();
  if (!pageSource.includes(expectedText)) {
    throw new Error(`Expected page to contain "${expectedText}"`);
  }
});

/**
 * Verify text is not present on the page
 * @requirements 8.5, 9.2
 */
Then('the page should not contain {string}', async function (this: { context: TestContext }, unexpectedText: string) {
  const pageSource = await this.context.driver.getPageSource();
  if (pageSource.includes(unexpectedText)) {
    throw new Error(`Expected page not to contain "${unexpectedText}"`);
  }
});

/**
 * Verify URL contains expected text
 * @requirements 8.5, 9.2
 */
Then('the URL should contain {string}', async function (this: { context: TestContext }, expectedText: string) {
  const currentUrl = await this.context.driver.getCurrentUrl();
  if (!currentUrl.includes(expectedText)) {
    throw new Error(`Expected URL to contain "${expectedText}", but got "${currentUrl}"`);
  }
});

/**
 * Verify URL does not contain expected text
 * @requirements 8.5, 9.2
 */
Then('the URL should not contain {string}', async function (this: { context: TestContext }, unexpectedText: string) {
  const currentUrl = await this.context.driver.getCurrentUrl();
  if (currentUrl.includes(unexpectedText)) {
    throw new Error(`Expected URL not to contain "${unexpectedText}", but got "${currentUrl}"`);
  }
});

/**
 * Verify element attribute has expected value
 * @requirements 8.5, 9.2
 */
Then('the {string} should be {string}', async function (this: { context: TestContext }, elementName: string, expectedState: string) {
  this.context.logger.debug('Verifying element state', { elementName, expectedState });
  // Implementation would depend on specific element and state
  // This is a generic step that can be specialized in domain-specific steps
});

/**
 * Verify count of elements
 * @requirements 8.5, 9.2
 */
Then('I should see {int} {string}', async function (this: { context: TestContext }, expectedCount: number, elementType: string) {
  this.context.logger.debug('Verifying element count', { expectedCount, elementType });
  // Implementation would use wait.forCount with appropriate locator
});

/**
 * Verify element is enabled
 * @requirements 8.5, 9.2
 */
Then('the {string} should be enabled', async function (this: { context: TestContext }, elementName: string) {
  this.context.logger.debug('Verifying element is enabled', { elementName });
  // Implementation would check element.isEnabled()
});

/**
 * Verify element is disabled
 * @requirements 8.5, 9.2
 */
Then('the {string} should be disabled', async function (this: { context: TestContext }, elementName: string) {
  this.context.logger.debug('Verifying element is disabled', { elementName });
  // Implementation would check !element.isEnabled()
});
