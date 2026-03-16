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
import { BasePage } from '../base-page.js';
import type { TestContext } from '../../types/context.types.js';
export declare class LoginPage extends BasePage<LoginPage> {
    readonly pageName = "LoginPage";
    protected get pageUrl(): string;
    constructor(context: TestContext);
    /**
     * Navigate to login page and verify it loaded
     */
    navigateToLogin(): Promise<LoginPage>;
    /**
     * Navigate to password recovery page
     */
    navigateToPasswordRecovery(): Promise<LoginPage>;
    /**
     * Verify email input field is visible
     */
    isEmailFieldVisible(): Promise<boolean>;
    /**
     * Verify password input field is visible
     */
    isPasswordFieldVisible(): Promise<boolean>;
    /**
     * Verify login button is visible
     */
    isLoginButtonVisible(): Promise<boolean>;
    /**
     * Verify forgot password link is visible
     */
    isForgotPasswordLinkVisible(): Promise<boolean>;
    /**
     * Verify recovery email input is visible
     */
    isRecoveryEmailInputVisible(): Promise<boolean>;
    /**
     * Verify reset button is visible
     */
    isResetButtonVisible(): Promise<boolean>;
    /**
     * Verify company logo is visible
     */
    isLogoVisible(): Promise<boolean>;
    /**
     * Verify back to login link is visible
     * @param linkText - Text of the link (e.g., "Go back to login")
     */
    isBackToLoginLinkVisible(linkText: string): Promise<boolean>;
    /**
     * Check if email field is empty
     */
    isEmailFieldEmpty(): Promise<boolean>;
    /**
     * Check if password field is empty
     */
    isPasswordFieldEmpty(): Promise<boolean>;
    /**
     * Check field type attribute
     * @param fieldName - Name of the field ("E-mail" or "Password")
     * @param expectedType - Expected type attribute value
     */
    checkFieldType(fieldName: string, expectedType: string): Promise<boolean>;
    /**
     * Check if reset button is disabled
     */
    isResetButtonDisabled(): Promise<boolean>;
    /**
     * Check if reset button is enabled
     */
    isResetButtonEnabled(): Promise<boolean>;
    /**
     * Check if password is masked (type="password")
     */
    isPasswordMasked(): Promise<boolean>;
    /**
     * Check if password is visible (type="text")
     */
    isPasswordVisible(): Promise<boolean>;
    /**
     * Enter email address
     * @param email - Email address to enter
     */
    enterEmail(email: string): Promise<LoginPage>;
    /**
     * Enter password
     * @param password - Password to enter
     */
    enterPassword(password: string): Promise<LoginPage>;
    /**
     * Clear email field
     */
    clearEmail(): Promise<LoginPage>;
    /**
     * Clear password field
     */
    clearPassword(): Promise<LoginPage>;
    /**
     * Click login button
     */
    clickLoginButton(): Promise<LoginPage>;
    /**
     * Click forgot password link
     */
    clickForgotPasswordLink(): Promise<LoginPage>;
    /**
     * Click password visibility toggle (eye icon)
     */
    clickPasswordVisibilityToggle(): Promise<LoginPage>;
    /**
     * Enter email in recovery page
     * @param email - Email address for password recovery
     */
    enterRecoveryEmail(email: string): Promise<LoginPage>;
    /**
     * Leave recovery email field blank (clear it)
     */
    leaveRecoveryEmailBlank(): Promise<LoginPage>;
    /**
     * Check if redirected to forgot password page
     */
    isOnForgotPasswordPage(): Promise<boolean>;
    /**
     * Get result message after login attempt
     */
    getResultMessage(): Promise<string>;
    /**
     * Check for specific error message
     * @param field - Field name that has error ("email", "Password", "Both fields")
     */
    getErrorMessage(field: string): Promise<string>;
    /**
     * Complete login flow
     * @param email - Email address
     * @param password - Password
     */
    login(email: string, password: string): Promise<LoginPage>;
    /**
     * Verify login API payload (for API testing scenarios)
     * Note: This requires network interception - implement based on your needs
     */
    verifyLoginApiPayload(): Promise<boolean>;
}
//# sourceMappingURL=login-page.d.ts.map