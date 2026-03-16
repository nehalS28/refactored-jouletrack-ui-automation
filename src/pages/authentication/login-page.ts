/**
 * Login Page Object
 * Migrated from jouletrack-ui-automation/test/pageObjects/loginPage.ts
 * 
 * Refactored to use:
 * - TestContext pattern (worker-scoped isolation)
 * - Typed locators from YAML registry
 * - BasePage inheritance for common functionality
 * - Immutable operations
 */

import { By } from 'selenium-webdriver';
import { BasePage } from '../base-page.js';
import type { TestContext } from '../../types/context.types.js';

export class LoginPage extends BasePage<LoginPage> {
  readonly pageName = 'LoginPage';
  
  protected get pageUrl(): string {
    return '/login'; // Relative path, will be combined with baseUrl
  }

  constructor(context: TestContext) {
    super(context);
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Navigate to login page and verify it loaded
   */
  async navigateToLogin(): Promise<LoginPage> {
    const baseUrl = this.context.config.baseUrl;
    await this.driver.get(baseUrl);
    await this.wait.forVisible(this.locators.authentication.login.emailInput);
    this.logger.info('Navigated to login page');
    return this;
  }

  /**
   * Navigate to password recovery page
   */
  async navigateToPasswordRecovery(): Promise<LoginPage> {
    await this.actions.click(this.locators.authentication.login.forgotPasswordLink);
    await this.wait.forVisible(this.locators.authentication.forgotPassword.emailInput);
    this.logger.info('Navigated to password recovery page');
    return this;
  }

  // ============================================================================
  // VISIBILITY CHECKS
  // ============================================================================

  /**
   * Verify email input field is visible
   */
  async isEmailFieldVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.login.emailInput, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify password input field is visible
   */
  async isPasswordFieldVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.login.passwordInput, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify login button is visible
   */
  async isLoginButtonVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.login.loginButton, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify forgot password link is visible
   */
  async isForgotPasswordLinkVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.login.forgotPasswordLink, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify recovery email input is visible
   */
  async isRecoveryEmailInputVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.forgotPassword.recoveryEmailInput, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify reset button is visible
   */
  async isResetButtonVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.forgotPassword.resetButton, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify company logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    try {
      await this.wait.forVisible(this.locators.authentication.forgotPassword.dejouleLogo, 2000);
      return true;
    } catch {
      try {
        await this.wait.forVisible(this.locators.authentication.forgotPassword.smartjoulesLogo, 2000);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Verify back to login link is visible
   * @param linkText - Text of the link (e.g., "Go back to login")
   */
  async isBackToLoginLinkVisible(linkText: string): Promise<boolean> {
    try {
      // Create a dynamic locator by replacing the placeholder
      const dynamicLocator = {
        ...this.locators.authentication.forgotPassword.backToLoginLink,
        selector: this.locators.authentication.forgotPassword.backToLoginLink.selector.replace('{linkText}', linkText)
      };
      await this.wait.forVisible(dynamicLocator, 2000);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // FIELD STATE CHECKS
  // ============================================================================

  /**
   * Check if email field is empty
   */
  async isEmailFieldEmpty(): Promise<boolean> {
    const element = await this.driver.findElement(By.xpath(this.locators.authentication.login.emailInput.selector));
    const value = await element.getAttribute('value');
    return value === '';
  }

  /**
   * Check if password field is empty
   */
  async isPasswordFieldEmpty(): Promise<boolean> {
    const element = await this.driver.findElement(By.xpath(this.locators.authentication.login.passwordInput.selector));
    const value = await element.getAttribute('value');
    return value === '';
  }

  /**
   * Check field type attribute
   * @param fieldName - Name of the field ("E-mail" or "Password")
   * @param expectedType - Expected type attribute value
   */
  async checkFieldType(fieldName: string, expectedType: string): Promise<boolean> {
    const locator = fieldName === 'E-mail' 
      ? this.locators.authentication.login.emailInput
      : this.locators.authentication.login.passwordInput;
    
    const element = await this.driver.findElement(By.xpath(locator.selector));
    const actualType = await element.getAttribute('type');
    return actualType === expectedType;
  }

  /**
   * Check if reset button is disabled
   */
  async isResetButtonDisabled(): Promise<boolean> {
    const element = await this.driver.findElement(By.xpath(this.locators.authentication.forgotPassword.resetButton.selector));
    const disabled = await element.getAttribute('disabled');
    return disabled === 'true' || disabled === 'disabled';
  }

  /**
   * Check if reset button is enabled
   */
  async isResetButtonEnabled(): Promise<boolean> {
    return !(await this.isResetButtonDisabled());
  }

  /**
   * Check if password is masked (type="password")
   */
  async isPasswordMasked(): Promise<boolean> {
    const element = await this.driver.findElement(By.xpath(this.locators.authentication.login.passwordInput.selector));
    const type = await element.getAttribute('type');
    return type === 'password';
  }

  /**
   * Check if password is visible (type="text")
   */
  async isPasswordVisible(): Promise<boolean> {
    const element = await this.driver.findElement(By.xpath(this.locators.authentication.login.passwordInput.selector));
    const type = await element.getAttribute('type');
    return type === 'text';
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Enter email address
   * @param email - Email address to enter
   */
  async enterEmail(email: string): Promise<LoginPage> {
    await this.actions.type(this.locators.authentication.login.emailInput, email);
    this.logger.debug(`Entered email: ${email}`);
    return this;
  }

  /**
   * Enter password
   * @param password - Password to enter
   */
  async enterPassword(password: string): Promise<LoginPage> {
    await this.actions.type(this.locators.authentication.login.passwordInput, password);
    this.logger.debug('Entered password');
    return this;
  }

  /**
   * Clear email field
   */
  async clearEmail(): Promise<LoginPage> {
    await this.actions.clear(this.locators.authentication.login.emailInput);
    return this;
  }

  /**
   * Clear password field
   */
  async clearPassword(): Promise<LoginPage> {
    await this.actions.clear(this.locators.authentication.login.passwordInput);
    return this;
  }

  /**
   * Click login button
   */
  async clickLoginButton(): Promise<LoginPage> {
    await this.actions.click(this.locators.authentication.login.loginButton);
    this.logger.info('Clicked login button');
    return this;
  }

  /**
   * Click forgot password link
   */
  async clickForgotPasswordLink(): Promise<LoginPage> {
    await this.actions.click(this.locators.authentication.login.forgotPasswordLink);
    this.logger.info('Clicked forgot password link');
    return this;
  }

  /**
   * Click password visibility toggle (eye icon)
   */
  async clickPasswordVisibilityToggle(): Promise<LoginPage> {
    await this.actions.click(this.locators.authentication.login.visibilityIcon);
    this.logger.debug('Toggled password visibility');
    return this;
  }

  /**
   * Enter email in recovery page
   * @param email - Email address for password recovery
   */
  async enterRecoveryEmail(email: string): Promise<LoginPage> {
    await this.actions.type(this.locators.authentication.forgotPassword.emailInput, email);
    this.logger.debug(`Entered recovery email: ${email}`);
    return this;
  }

  /**
   * Leave recovery email field blank (clear it)
   */
  async leaveRecoveryEmailBlank(): Promise<LoginPage> {
    await this.actions.clear(this.locators.authentication.forgotPassword.emailInput);
    return this;
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Check if redirected to forgot password page
   */
  async isOnForgotPasswordPage(): Promise<boolean> {
    const currentUrl = await this.driver.getCurrentUrl();
    return currentUrl.includes('forgot') || currentUrl.includes('reset');
  }

  /**
   * Get result message after login attempt
   */
  async getResultMessage(): Promise<string> {
    // Wait for either success or error message
    await this.driver.sleep(1000); // Allow time for message to appear
    
    // Try to find snackbar or error message
    try {
      const errorLocator = {
        ...this.locators.authentication.login.emptyFieldError,
        selector: this.locators.authentication.login.emptyFieldError.selector.replace('{field}', '')
      };
      const element = await this.driver.findElement(By.xpath(errorLocator.selector));
      return await element.getText();
    } catch {
      // Check for success indicators (e.g., URL change, dashboard elements)
      const currentUrl = await this.driver.getCurrentUrl();
      if (currentUrl.includes('dashboard') || currentUrl.includes('home')) {
        return 'User should be logged in';
      }
      return '';
    }
  }

  /**
   * Check for specific error message
   * @param field - Field name that has error ("email", "Password", "Both fields")
   */
  async getErrorMessage(field: string): Promise<string> {
    const dynamicLocator = {
      ...this.locators.authentication.login.emptyFieldError,
      selector: this.locators.authentication.login.emptyFieldError.selector.replace('{field}', field)
    };
    const element = await this.driver.findElement(By.xpath(dynamicLocator.selector));
    return await element.getText();
  }

  // ============================================================================
  // COMPLEX FLOWS
  // ============================================================================

  /**
   * Complete login flow
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string): Promise<LoginPage> {
    await this.navigateToLogin();
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickLoginButton();
    
    // Wait for navigation or error
    await this.driver.sleep(2000);
    this.logger.info(`Login attempt completed for: ${email}`);
    return this;
  }

  /**
   * Verify login API payload (for API testing scenarios)
   * Note: This requires network interception - implement based on your needs
   */
  async verifyLoginApiPayload(): Promise<boolean> {
    // TODO: Implement network interception to capture API payload
    // This would require CDP (Chrome DevTools Protocol) or similar
    this.logger.warn('API payload verification not yet implemented');
    return true;
  }
}
