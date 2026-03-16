# Example Test Suite: Authentication Domain

This document provides a complete, working example of a test suite for the authentication domain. Use this as a reference when creating new test suites.

## Overview

The authentication domain example demonstrates:
- Feature file with Gherkin scenarios
- Step definitions with proper delegation
- Page objects with business actions
- Locator registry in YAML
- Test data fixtures
- Best practices and patterns

## File Structure

```
packages/ui-automation/
├── features/authentication/
│   └── login.feature                    # Gherkin scenarios
├── src/
│   ├── locators/registry/
│   │   └── authentication.yaml          # Locator definitions
│   ├── pages/authentication/
│   │   └── login-page.ts                # Page object
│   ├── steps/authentication/
│   │   └── login.steps.ts               # Step definitions
│   └── data/fixtures/
│       └── authentication.yaml          # Test data
```

## 1. Feature File

**Location**: `features/authentication/login.feature`

```gherkin
@authentication @critical @domain-authentication
Feature: User Login
  As a user
  I want to log in to the application
  So that I can access my account

  Background:
    Given the application is running
    And I am on the login page

  @smoke @critical @regression
  Scenario: Successful login with valid credentials
    When I enter username "testuser@example.com"
    And I enter password "ValidPassword123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message

  @regression
  Scenario: Failed login with invalid credentials
    When I enter username "invalid@example.com"
    And I enter password "WrongPassword"
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  @regression
  Scenario: Failed login with empty username
    When I enter username ""
    And I enter password "ValidPassword123"
    And I click the login button
    Then I should see an error message "Username is required"

  @regression
  Scenario: Failed login with empty password
    When I enter username "testuser@example.com"
    And I enter password ""
    And I click the login button
    Then I should see an error message "Password is required"

  @smoke
  Scenario: Password visibility toggle
    When I enter password "SecretPassword"
    And I click the password visibility toggle
    Then the password should be visible
    When I click the password visibility toggle
    Then the password should be hidden

  @regression
  Scenario: Remember me functionality
    When I enter username "testuser@example.com"
    And I enter password "ValidPassword123"
    And I check the remember me checkbox
    And I click the login button
    Then I should be redirected to the dashboard
    When I log out
    And I return to the login page
    Then the username field should be pre-filled with "testuser@example.com"

  @regression
  Scenario Outline: Login with different user roles
    When I enter username "<username>"
    And I enter password "<password>"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see role "<role>" in the header

    Examples:
      | username              | password        | role    |
      | admin@example.com     | AdminPass123    | Admin   |
      | user@example.com      | UserPass123     | User    |
      | manager@example.com   | ManagerPass123  | Manager |
```

**Best Practices Demonstrated**:
- ✅ Tags for filtering (@smoke, @regression, @critical)
- ✅ Domain-specific tags (@authentication, @domain-authentication)
- ✅ Background for common preconditions
- ✅ Descriptive scenario names
- ✅ Scenario Outline for data-driven testing
- ✅ Clear Given/When/Then structure

## 2. Locator Registry

**Location**: `src/locators/registry/authentication.yaml`

```yaml
authentication:
  loginForm:
    usernameInput:
      selector: "[data-testid='username-input']"
      strategy: data-testid
      description: "Username input field on login page"
    
    passwordInput:
      selector: "[data-testid='password-input']"
      strategy: data-testid
      description: "Password input field on login page"
    
    submitButton:
      selector: "button[type='submit']"
      strategy: css
      description: "Login form submit button"
    
    errorMessage:
      selector: "[role='alert']"
      strategy: aria-label
      description: "Login error message container"
    
    rememberMeCheckbox:
      selector: "[data-testid='remember-me']"
      strategy: data-testid
      description: "Remember me checkbox on login form"
    
    passwordVisibilityToggle:
      selector: "[data-testid='password-toggle']"
      strategy: data-testid
      description: "Toggle button to show/hide password"

  forgotPassword:
    link:
      selector: "a[href*='forgot-password']"
      strategy: css
      description: "Forgot password link"
    
    emailInput:
      selector: "[data-testid='forgot-email-input']"
      strategy: data-testid
      description: "Email input field on forgot password page"
    
    submitButton:
      selector: "[data-testid='forgot-submit']"
      strategy: data-testid
      description: "Submit button on forgot password form"
```

**Best Practices Demonstrated**:
- ✅ Organized by page/component hierarchy
- ✅ Prefer data-testid strategy for stability
- ✅ Descriptive names (usernameInput, not input1)
- ✅ Human-readable descriptions
- ✅ Consistent naming conventions

**After editing, generate typed locators**:
```bash
npm run generate:locators
```

## 3. Page Object

**Location**: `src/pages/authentication/login-page.ts`

```typescript
import { BasePage } from '../base-page.js';
import type { TestContext } from '../../types/context.types.js';

/**
 * Page object for the login page.
 * Implements business actions for user authentication.
 */
export class LoginPage extends BasePage<LoginPage> {
  readonly pageName = 'login-page';

  constructor(context: TestContext) {
    super(context);
  }

  protected get pageUrl(): string {
    return '/login';
  }

  /**
   * Enters the username into the username input field.
   */
  async enterUsername(username: string): Promise<this> {
    this.logger.debug('Entering username', { page: this.pageName });
    await this.actions.type(
      this.locators.authentication.loginForm.usernameInput, 
      username
    );
    return this;
  }

  /**
   * Enters the password into the password input field.
   */
  async enterPassword(password: string): Promise<this> {
    this.logger.debug('Entering password', { page: this.pageName });
    await this.actions.type(
      this.locators.authentication.loginForm.passwordInput, 
      password
    );
    return this;
  }

  /**
   * Clicks the submit button to submit the login form.
   */
  async submitLogin(): Promise<this> {
    this.logger.debug('Submitting login form', { page: this.pageName });
    await this.actions.click(
      this.locators.authentication.loginForm.submitButton
    );
    return this;
  }

  /**
   * Performs a complete login operation with the provided credentials.
   */
  async login(username: string, password: string): Promise<this> {
    this.logger.info('Performing login', { page: this.pageName });
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.submitLogin();
    return this;
  }

  /**
   * Gets the error message text displayed on the login page.
   */
  async getErrorMessage(): Promise<string> {
    this.logger.debug('Getting error message', { page: this.pageName });
    return this.actions.getText(
      this.locators.authentication.loginForm.errorMessage
    );
  }

  /**
   * Checks if an error message is currently displayed.
   */
  async isErrorDisplayed(): Promise<boolean> {
    this.logger.debug('Checking if error is displayed', { page: this.pageName });
    try {
      await this.wait.forVisible(
        this.locators.authentication.loginForm.errorMessage, 
        2000
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Toggles the password visibility using the visibility toggle button.
   */
  async togglePasswordVisibility(): Promise<this> {
    this.logger.debug('Toggling password visibility', { page: this.pageName });
    await this.actions.click(
      this.locators.authentication.loginForm.passwordVisibilityToggle
    );
    return this;
  }

  /**
   * Checks or unchecks the "Remember Me" checkbox.
   */
  async toggleRememberMe(): Promise<this> {
    this.logger.debug('Toggling remember me checkbox', { page: this.pageName });
    await this.actions.click(
      this.locators.authentication.loginForm.rememberMeCheckbox
    );
    return this;
  }

  /**
   * Checks if the "Remember Me" checkbox is currently checked.
   */
  async isRememberMeChecked(): Promise<boolean> {
    this.logger.debug('Checking if remember me is checked', { page: this.pageName });
    const value = await this.actions.getAttribute(
      this.locators.authentication.loginForm.rememberMeCheckbox,
      'checked'
    );
    return value === 'true';
  }
}
```

**Best Practices Demonstrated**:
- ✅ Extends BasePage for common functionality
- ✅ Uses typed locators (compile-time safety)
- ✅ Fluent interface (returns `this` for chaining)
- ✅ Business-focused method names
- ✅ Logging for debugging
- ✅ JSDoc comments for documentation
- ✅ Delegates to ActionHelper (no direct WebDriver calls)

## 4. Step Definitions

**Location**: `src/steps/authentication/login.steps.ts`

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'vitest';
import type { TestContext } from '../../types/context.types.js';
import { LoginPage } from '../../pages/authentication/login-page.js';

/**
 * Navigate to the login page
 */
Given('I am on the login page', async function (this: { context: TestContext }) {
  const loginPage = new LoginPage(this.context);
  await loginPage.navigate();
});

/**
 * Enter username into the login form
 */
When('I enter username {string}', async function (
  this: { context: TestContext }, 
  username: string
) {
  const loginPage = new LoginPage(this.context);
  await loginPage.enterUsername(username);
});

/**
 * Enter password into the login form
 */
When('I enter password {string}', async function (
  this: { context: TestContext }, 
  password: string
) {
  const loginPage = new LoginPage(this.context);
  await loginPage.enterPassword(password);
});

/**
 * Click the login button to submit the form
 */
When('I click the login button', async function (this: { context: TestContext }) {
  const loginPage = new LoginPage(this.context);
  await loginPage.submitLogin();
});

/**
 * Verify error message is displayed
 */
Then('I should see an error message {string}', async function (
  this: { context: TestContext }, 
  expectedMessage: string
) {
  const loginPage = new LoginPage(this.context);
  const actualMessage = await loginPage.getErrorMessage();
  expect(actualMessage).toContain(expectedMessage);
});

/**
 * Toggle password visibility
 */
When('I click the password visibility toggle', async function (
  this: { context: TestContext }
) {
  const loginPage = new LoginPage(this.context);
  await loginPage.togglePasswordVisibility();
});

/**
 * Check the remember me checkbox
 */
When('I check the remember me checkbox', async function (
  this: { context: TestContext }
) {
  const loginPage = new LoginPage(this.context);
  await loginPage.toggleRememberMe();
});

/**
 * Verify remember me checkbox is checked
 */
Then('the remember me checkbox should be checked', async function (
  this: { context: TestContext }
) {
  const loginPage = new LoginPage(this.context);
  const isChecked = await loginPage.isRememberMeChecked();
  expect(isChecked).toBe(true);
});
```

**Best Practices Demonstrated**:
- ✅ Thin step definitions (< 10 lines each)
- ✅ Delegates to page objects
- ✅ Parameterized steps for reusability
- ✅ Uses TestContext from `this.context`
- ✅ Clear JSDoc comments
- ✅ Proper TypeScript typing

## 5. Test Data Fixtures

**Location**: `src/data/fixtures/authentication.yaml`

```yaml
# Authentication test data
# Uses environment variable resolution for sensitive data

validUser:
  username: ${TEST_USERNAME}
  password: ${TEST_PASSWORD}
  role: "User"

adminUser:
  username: ${ADMIN_USERNAME}
  password: ${ADMIN_PASSWORD}
  role: "Admin"

managerUser:
  username: ${MANAGER_USERNAME}
  password: ${MANAGER_PASSWORD}
  role: "Manager"

invalidUser:
  username: "invalid@example.com"
  password: "WrongPassword"

testUsers:
  - username: "user1@example.com"
    password: "Pass123"
    role: "User"
  - username: "user2@example.com"
    password: "Pass456"
    role: "User"
```

**Usage in step definitions**:

```typescript
import { TestDataManager } from '../../data/test-data-manager.js';

When('I log in as a valid user', async function (this: { context: TestContext }) {
  const dataManager = new TestDataManager(this.context.config);
  const userData = dataManager.get('authentication.validUser');
  
  const loginPage = new LoginPage(this.context);
  await loginPage.login(userData.username, userData.password);
});
```

**Best Practices Demonstrated**:
- ✅ Environment variable references (${VAR})
- ✅ No hardcoded credentials
- ✅ Organized by user type
- ✅ Supports arrays for data-driven tests

## 6. Running the Example

### Run all authentication tests

```bash
TAG_FILTER="@authentication" npm test
```

### Run only smoke tests

```bash
TAG_FILTER="@smoke" npm test
```

### Run with specific environment

```bash
ENVIRONMENT=staging TAG_FILTER="@authentication" npm test
```

### Run in parallel

```bash
PARALLEL_WORKERS=4 TAG_FILTER="@authentication" npm test
```

## 7. Extending the Example

### Add a new scenario

1. **Add to feature file**:

```gherkin
@regression
Scenario: Account lockout after failed attempts
  When I enter username "testuser@example.com"
  And I enter password "WrongPassword"
  And I click the login button 5 times
  Then I should see an error message "Account locked"
  And the login button should be disabled
```

2. **Add step definition** (if needed):

```typescript
When('I click the login button {int} times', async function (
  this: { context: TestContext }, 
  times: number
) {
  const loginPage = new LoginPage(this.context);
  for (let i = 0; i < times; i++) {
    await loginPage.submitLogin();
  }
});
```

3. **Add page object method** (if needed):

```typescript
async isLoginButtonDisabled(): Promise<boolean> {
  const disabled = await this.actions.getAttribute(
    this.locators.authentication.loginForm.submitButton,
    'disabled'
  );
  return disabled === 'true';
}
```

### Add a new page (Forgot Password)

1. **Add locators** to `authentication.yaml` (already exists)

2. **Create page object** `src/pages/authentication/forgot-password-page.ts`:

```typescript
import { BasePage } from '../base-page.js';
import type { TestContext } from '../../types/context.types.js';

export class ForgotPasswordPage extends BasePage<ForgotPasswordPage> {
  readonly pageName = 'forgot-password-page';

  constructor(context: TestContext) {
    super(context);
  }

  protected get pageUrl(): string {
    return '/forgot-password';
  }

  async enterEmail(email: string): Promise<this> {
    await this.actions.type(
      this.locators.authentication.forgotPassword.emailInput, 
      email
    );
    return this;
  }

  async submitRequest(): Promise<this> {
    await this.actions.click(
      this.locators.authentication.forgotPassword.submitButton
    );
    return this;
  }

  async getSuccessMessage(): Promise<string> {
    return this.actions.getText(
      this.locators.authentication.forgotPassword.successMessage
    );
  }
}
```

3. **Create feature file** `features/authentication/forgot-password.feature`

4. **Create step definitions** `src/steps/authentication/forgot-password.steps.ts`

## 8. Testing Best Practices

### DO ✅

- Use typed locators from the registry
- Keep step definitions thin (< 10 lines)
- Delegate business logic to page objects
- Use fluent interface for method chaining
- Add descriptive tags for filtering
- Use environment variables for credentials
- Log important actions for debugging
- Write reusable, parameterized steps

### DON'T ❌

- Don't hardcode selectors in page objects
- Don't put business logic in step definitions
- Don't hardcode credentials in test data
- Don't use hardcoded waits (use WaitStrategy)
- Don't access WebDriver directly (use ActionHelper)
- Don't create duplicate step definitions
- Don't skip error handling
- Don't forget to generate locators after YAML changes

## 9. Debugging Tips

### Enable debug logging

```bash
LOG_LEVEL=debug TAG_FILTER="@authentication" npm test
```

### Run a single scenario

```bash
TAG_FILTER="@smoke and @authentication" npm test
```

### Check generated locators

```bash
cat src/locators/generated/index.ts
```

### View test metrics

```bash
npm run cli metrics:report --format console
```

## 10. Next Steps

- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design details
- Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Explore other domains (dashboard, reports, settings)
- Add your own test scenarios following this pattern

## Summary

This example demonstrates a complete, production-ready test suite following framework best practices. Use it as a template when creating new test suites for other domains.

**Key Takeaways**:
- Typed locators provide compile-time safety
- Page objects encapsulate business actions
- Step definitions stay thin and delegate
- Test data uses environment variables
- Domain-based organization scales well
- Tags enable flexible test filtering
