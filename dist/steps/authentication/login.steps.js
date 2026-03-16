/**
 * Login Step Definitions
 * Migrated from jouletrack-ui-automation/test/step-definitions/loginStep.ts
 *
 * All 27 step definitions from old framework, refactored to use:
 * - TestContext pattern
 * - LoginPage with typed locators
 * - Environment variable substitution
 * - Proper async/await patterns
 */
import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { LoginPage } from '../../pages/authentication/login-page.js';
setDefaultTimeout(60000);
// ============================================================================
// NAVIGATION STEPS (2)
// ============================================================================
Given('I navigate to the login page', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.navigateToLogin();
});
Given('I navigate to the password recovery page', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.navigateToPasswordRecovery();
});
// ============================================================================
// VISIBILITY CHECK STEPS (7)
// ============================================================================
Then('I should see a E-mail input field', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isEmailFieldVisible();
    if (!isVisible) {
        throw new Error('Email input field is not visible');
    }
});
Then('I should see a Password input field', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isPasswordFieldVisible();
    if (!isVisible) {
        throw new Error('Password input field is not visible');
    }
});
Then('I should see a login button', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isLoginButtonVisible();
    if (!isVisible) {
        throw new Error('Login button is not visible');
    }
});
Then('I should see a forget password link', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isForgotPasswordLinkVisible();
    if (!isVisible) {
        throw new Error('Forgot password link is not visible');
    }
});
When('I should see an email input field', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isRecoveryEmailInputVisible();
    if (!isVisible) {
        throw new Error('Recovery email input field is not visible');
    }
});
Given('I should see a SEND RESET LINK button', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isResetButtonVisible();
    if (!isVisible) {
        throw new Error('Send Reset Link button is not visible');
    }
});
Given('I should see the company logo', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isLogoVisible();
    if (!isVisible) {
        throw new Error('Company logo is not visible');
    }
});
Given('I should see a {string} link', async function (linkText) {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isBackToLoginLinkVisible(linkText);
    if (!isVisible) {
        throw new Error(`Link "${linkText}" is not visible`);
    }
});
// ============================================================================
// FIELD STATE CHECK STEPS (5)
// ============================================================================
Then('the E-mail input field should be empty', async function () {
    const loginPage = new LoginPage(this);
    const isEmpty = await loginPage.isEmailFieldEmpty();
    if (!isEmpty) {
        throw new Error('Email input field is not empty');
    }
});
When('the Password input field should be empty', async function () {
    const loginPage = new LoginPage(this);
    const isEmpty = await loginPage.isPasswordFieldEmpty();
    if (!isEmpty) {
        throw new Error('Password input field is not empty');
    }
});
Then('the {string} input field should be of type {string}', async function (fieldName, expectedType) {
    const loginPage = new LoginPage(this);
    const isCorrectType = await loginPage.checkFieldType(fieldName, expectedType);
    if (!isCorrectType) {
        throw new Error(`${fieldName} field is not of type ${expectedType}`);
    }
});
Then('the Send Reset Link button should be disabled', async function () {
    const loginPage = new LoginPage(this);
    const isDisabled = await loginPage.isResetButtonDisabled();
    if (!isDisabled) {
        throw new Error('Send Reset Link button is not disabled');
    }
});
Then('the Send Reset Link button should be enabled', async function () {
    const loginPage = new LoginPage(this);
    const isEnabled = await loginPage.isResetButtonEnabled();
    if (!isEnabled) {
        throw new Error('Send Reset Link button is not enabled');
    }
});
Then('the password should be masked', async function () {
    const loginPage = new LoginPage(this);
    const isMasked = await loginPage.isPasswordMasked();
    if (!isMasked) {
        throw new Error('Password is not masked');
    }
});
Then('the password should be visible', async function () {
    const loginPage = new LoginPage(this);
    const isVisible = await loginPage.isPasswordVisible();
    if (!isVisible) {
        throw new Error('Password is not visible');
    }
});
// ============================================================================
// ACTION STEPS (8)
// ============================================================================
When('I click on the forget password link', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.clickForgotPasswordLink();
});
When('I enter {string} in the E-mail input field', async function (email) {
    const loginPage = new LoginPage(this);
    // Substitute environment variable if needed
    const actualEmail = email === 'VALID_EMAIL' ? process.env['VALID_EMAIL'] || email : email;
    await loginPage.enterEmail(actualEmail);
});
When('I enter {string} in the Password input field', async function (password) {
    const loginPage = new LoginPage(this);
    // Substitute environment variable if needed
    const actualPassword = password === 'VALID_PASSWORD' ? process.env['VALID_PASSWORD'] || password : password;
    await loginPage.enterPassword(actualPassword);
});
When('I click the login button', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.clickLoginButton();
});
When('the E-mail input field is empty', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.clearEmail();
});
When('the Password input field is empty', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.clearPassword();
});
When('I click on the {string} icon', async function (iconName) {
    const loginPage = new LoginPage(this);
    if (iconName.toLowerCase() === 'eye') {
        await loginPage.clickPasswordVisibilityToggle();
    }
});
When('I enter a valid email in the email input field', async function () {
    const loginPage = new LoginPage(this);
    const validEmail = process.env['VALID_EMAIL'] || 'test@example.com';
    await loginPage.enterRecoveryEmail(validEmail);
});
When('I leave the Email Input field as blank in reset page', async function () {
    const loginPage = new LoginPage(this);
    await loginPage.leaveRecoveryEmailBlank();
});
// ============================================================================
// ASSERTION STEPS (5)
// ============================================================================
Then('I should be redirected to the forget password page', async function () {
    const loginPage = new LoginPage(this);
    const isOnPage = await loginPage.isOnForgotPasswordPage();
    if (!isOnPage) {
        throw new Error('Not redirected to forgot password page');
    }
});
Then('I should see {string}', async function (expectedResult) {
    const loginPage = new LoginPage(this);
    const actualResult = await loginPage.getResultMessage();
    // Handle different result messages
    if (expectedResult === 'User should be logged in') {
        const currentUrl = await this.driver.getCurrentUrl();
        if (!currentUrl.includes('dashboard') && !currentUrl.includes('home')) {
            throw new Error(`Expected to be logged in, but current URL is: ${currentUrl}`);
        }
    }
    else {
        if (!actualResult.includes(expectedResult)) {
            throw new Error(`Expected "${expectedResult}", but got "${actualResult}"`);
        }
    }
});
Then('I should see an error message {string} required', async function (field) {
    const loginPage = new LoginPage(this);
    const errorMessage = await loginPage.getErrorMessage(field);
    if (!errorMessage.toLowerCase().includes('required')) {
        throw new Error(`Expected error message for "${field}" required, but got: ${errorMessage}`);
    }
});
// ============================================================================
// COMPLEX FLOW STEPS (2)
// ============================================================================
Given('I log in with {string} and {string}', async function (email, password) {
    const loginPage = new LoginPage(this);
    // Substitute environment variables
    const actualEmail = email === 'VALID_EMAIL' ? process.env['VALID_EMAIL'] || email : email;
    const actualPassword = password === 'VALID_PASSWORD' ? process.env['VALID_PASSWORD'] || password : password;
    await loginPage.login(actualEmail, actualPassword);
});
Then('Verify the login API is triggered and its {string},{string}', async function (_email, _password) {
    const loginPage = new LoginPage(this);
    // Note: API payload verification not yet implemented
    // The email and password parameters are for future API verification
    const isValid = await loginPage.verifyLoginApiPayload();
    if (!isValid) {
        throw new Error('Login API payload verification failed');
    }
});
//# sourceMappingURL=login.steps.js.map