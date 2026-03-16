/**
 * Shared common step definitions.
 * Provides common actions across all domains.
 * 
 * @module steps/shared/common
 * @requirements 8.5, 9.2
 */

import { When, Then } from '@cucumber/cucumber';
import type { TestContext } from '../../types/context.types.js';

/**
 * Wait for a specified number of seconds
 * @requirements 8.5, 9.2
 */
When('I wait for {int} second(s)', async function (this: { context: TestContext }, seconds: number) {
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
});

/**
 * Wait for a specified number of milliseconds
 * @requirements 8.5, 9.2
 */
When('I wait for {int} millisecond(s)', async function (this: { context: TestContext }, milliseconds: number) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
});

/**
 * Click on an element by text
 * @requirements 8.5, 9.2
 */
When('I click on {string}', async function (this: { context: TestContext }, text: string) {
  this.context.logger.debug('Clicking element', { text });
  // Implementation would use actions.click with appropriate locator
  // This is a generic step that should be specialized in domain-specific steps
});

/**
 * Type text into an input field
 * @requirements 8.5, 9.2
 */
When('I type {string} into {string}', async function (this: { context: TestContext }, text: string, fieldName: string) {
  this.context.logger.debug('Typing into field', { text, fieldName });
  // Implementation would use actions.type with appropriate locator
});

/**
 * Clear an input field
 * @requirements 8.5, 9.2
 */
When('I clear the {string} field', async function (this: { context: TestContext }, fieldName: string) {
  this.context.logger.debug('Clearing field', { fieldName });
  // Implementation would use actions.clear with appropriate locator
});

/**
 * Select option from dropdown
 * @requirements 8.5, 9.2
 */
When('I select {string} from {string}', async function (this: { context: TestContext }, option: string, dropdownName: string) {
  this.context.logger.debug('Selecting from dropdown', { option, dropdownName });
  // Implementation would use actions.select with appropriate locator
});

/**
 * Check a checkbox
 * @requirements 8.5, 9.2
 */
When('I check the {string} checkbox', async function (this: { context: TestContext }, checkboxName: string) {
  this.context.logger.debug('Checking checkbox', { checkboxName });
  // Implementation would use actions.click with appropriate locator
});

/**
 * Uncheck a checkbox
 * @requirements 8.5, 9.2
 */
When('I uncheck the {string} checkbox', async function (this: { context: TestContext }, checkboxName: string) {
  this.context.logger.debug('Unchecking checkbox', { checkboxName });
  // Implementation would use actions.click with appropriate locator
});

/**
 * Hover over an element
 * @requirements 8.5, 9.2
 */
When('I hover over {string}', async function (this: { context: TestContext }, elementName: string) {
  this.context.logger.debug('Hovering over element', { elementName });
  // Implementation would use actions.hover with appropriate locator
});

/**
 * Scroll to an element
 * @requirements 8.5, 9.2
 */
When('I scroll to {string}', async function (this: { context: TestContext }, elementName: string) {
  this.context.logger.debug('Scrolling to element', { elementName });
  // Implementation would use actions.scrollIntoView with appropriate locator
});

/**
 * Take a screenshot
 * @requirements 8.5, 9.2
 */
When('I take a screenshot', async function (this: { context: TestContext }) {
  const screenshot = await this.context.driver.takeScreenshot();
  this.context.logger.debug('Screenshot captured', { size: screenshot.length });
  // Screenshot would be attached to the test report
});

/**
 * Switch to iframe
 * @requirements 8.5, 9.2
 */
When('I switch to iframe {string}', async function (this: { context: TestContext }, iframeName: string) {
  this.context.logger.debug('Switching to iframe', { iframeName });
  // Implementation would use driver.switchTo().frame()
});

/**
 * Switch to default content
 * @requirements 8.5, 9.2
 */
When('I switch to default content', async function (this: { context: TestContext }) {
  await this.context.driver.switchTo().defaultContent();
});

/**
 * Accept alert
 * @requirements 8.5, 9.2
 */
When('I accept the alert', async function (this: { context: TestContext }) {
  const alert = await this.context.driver.switchTo().alert();
  await alert.accept();
});

/**
 * Dismiss alert
 * @requirements 8.5, 9.2
 */
When('I dismiss the alert', async function (this: { context: TestContext }) {
  const alert = await this.context.driver.switchTo().alert();
  await alert.dismiss();
});

/**
 * Verify alert text
 * @requirements 8.5, 9.2
 */
Then('the alert text should be {string}', async function (this: { context: TestContext }, expectedText: string) {
  const alert = await this.context.driver.switchTo().alert();
  const actualText = await alert.getText();
  if (actualText !== expectedText) {
    throw new Error(`Expected alert text to be "${expectedText}", but got "${actualText}"`);
  }
});

/**
 * Log out (generic action)
 * @requirements 8.5, 9.2
 */
When('I log out', async function (this: { context: TestContext }) {
  this.context.logger.debug('Logging out');
  // Implementation would depend on the application's logout mechanism
  // This is a placeholder that should be specialized in domain-specific steps
});
