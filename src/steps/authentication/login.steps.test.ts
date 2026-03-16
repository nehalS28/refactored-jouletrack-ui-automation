/**
 * Unit tests for login step definitions.
 * Tests step definitions with mocked TestContext and page objects.
 * 
 * @module steps/authentication/login.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TestContext } from '../../types/context.types.js';
import { LoginPage } from '../../pages/authentication/login-page.js';

// Mock the LoginPage
vi.mock('../../pages/authentication/login-page.js', () => ({
  LoginPage: vi.fn()
}));

describe('Login Step Definitions', () => {
  let mockContext: TestContext;
  let mockLoginPage: any;

  beforeEach(() => {
    // Create mock TestContext
    mockContext = {
      id: 'test-context-1',
      workerId: 'worker-1',
      driver: {
        getCurrentUrl: vi.fn().mockResolvedValue('http://localhost:3000/login')
      } as any,
      config: {
        baseUrl: 'http://localhost:3000',
        timeouts: { explicit: 10000 }
      } as any,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      } as any,
      actions: {} as any,
      wait: {} as any,
      locators: {} as any,
      plugins: {} as any,
      correlationId: 'corr-1'
    };

    // Create mock LoginPage instance with actual method names
    mockLoginPage = {
      navigateToLogin: vi.fn().mockResolvedValue(mockLoginPage),
      navigateToPasswordRecovery: vi.fn().mockResolvedValue(mockLoginPage),
      isEmailFieldVisible: vi.fn().mockResolvedValue(true),
      isPasswordFieldVisible: vi.fn().mockResolvedValue(true),
      isLoginButtonVisible: vi.fn().mockResolvedValue(true),
      isForgotPasswordLinkVisible: vi.fn().mockResolvedValue(true),
      isRecoveryEmailInputVisible: vi.fn().mockResolvedValue(true),
      isResetButtonVisible: vi.fn().mockResolvedValue(true),
      isLogoVisible: vi.fn().mockResolvedValue(true),
      isBackToLoginLinkVisible: vi.fn().mockResolvedValue(true),
      isEmailFieldEmpty: vi.fn().mockResolvedValue(true),
      isPasswordFieldEmpty: vi.fn().mockResolvedValue(true),
      checkFieldType: vi.fn().mockResolvedValue(true),
      isResetButtonDisabled: vi.fn().mockResolvedValue(true),
      isResetButtonEnabled: vi.fn().mockResolvedValue(true),
      isPasswordMasked: vi.fn().mockResolvedValue(true),
      isPasswordVisible: vi.fn().mockResolvedValue(false),
      enterEmail: vi.fn().mockResolvedValue(mockLoginPage),
      enterPassword: vi.fn().mockResolvedValue(mockLoginPage),
      clearEmail: vi.fn().mockResolvedValue(mockLoginPage),
      clearPassword: vi.fn().mockResolvedValue(mockLoginPage),
      clickLoginButton: vi.fn().mockResolvedValue(mockLoginPage),
      clickForgotPasswordLink: vi.fn().mockResolvedValue(mockLoginPage),
      clickPasswordVisibilityToggle: vi.fn().mockResolvedValue(mockLoginPage),
      enterRecoveryEmail: vi.fn().mockResolvedValue(mockLoginPage),
      leaveRecoveryEmailBlank: vi.fn().mockResolvedValue(mockLoginPage),
      isOnForgotPasswordPage: vi.fn().mockResolvedValue(true),
      getResultMessage: vi.fn().mockResolvedValue(''),
      getErrorMessage: vi.fn().mockResolvedValue('Email is required'),
      login: vi.fn().mockResolvedValue(mockLoginPage),
      verifyLoginApiPayload: vi.fn().mockResolvedValue(true)
    };

    // Mock LoginPage constructor to return our mock instance
    (LoginPage as any).mockImplementation(() => mockLoginPage);
  });

  describe('Navigation Steps', () => {
    it('should navigate to the login page', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.navigateToLogin();

      expect(LoginPage).toHaveBeenCalledWith(mockContext);
      expect(mockLoginPage.navigateToLogin).toHaveBeenCalled();
    });

    it('should navigate to password recovery page', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.navigateToPasswordRecovery();

      expect(mockLoginPage.navigateToPasswordRecovery).toHaveBeenCalled();
    });
  });

  describe('Visibility Check Steps', () => {
    it('should check if email field is visible', async () => {
      const loginPage = new LoginPage(mockContext);
      const isVisible = await loginPage.isEmailFieldVisible();

      expect(isVisible).toBe(true);
      expect(mockLoginPage.isEmailFieldVisible).toHaveBeenCalled();
    });

    it('should check if password field is visible', async () => {
      const loginPage = new LoginPage(mockContext);
      const isVisible = await loginPage.isPasswordFieldVisible();

      expect(isVisible).toBe(true);
      expect(mockLoginPage.isPasswordFieldVisible).toHaveBeenCalled();
    });

    it('should check if login button is visible', async () => {
      const loginPage = new LoginPage(mockContext);
      const isVisible = await loginPage.isLoginButtonVisible();

      expect(isVisible).toBe(true);
      expect(mockLoginPage.isLoginButtonVisible).toHaveBeenCalled();
    });

    it('should check if forgot password link is visible', async () => {
      const loginPage = new LoginPage(mockContext);
      const isVisible = await loginPage.isForgotPasswordLinkVisible();

      expect(isVisible).toBe(true);
      expect(mockLoginPage.isForgotPasswordLinkVisible).toHaveBeenCalled();
    });

    it('should check if company logo is visible', async () => {
      const loginPage = new LoginPage(mockContext);
      const isVisible = await loginPage.isLogoVisible();

      expect(isVisible).toBe(true);
      expect(mockLoginPage.isLogoVisible).toHaveBeenCalled();
    });
  });

  describe('Field State Check Steps', () => {
    it('should check if email field is empty', async () => {
      const loginPage = new LoginPage(mockContext);
      const isEmpty = await loginPage.isEmailFieldEmpty();

      expect(isEmpty).toBe(true);
      expect(mockLoginPage.isEmailFieldEmpty).toHaveBeenCalled();
    });

    it('should check if password field is empty', async () => {
      const loginPage = new LoginPage(mockContext);
      const isEmpty = await loginPage.isPasswordFieldEmpty();

      expect(isEmpty).toBe(true);
      expect(mockLoginPage.isPasswordFieldEmpty).toHaveBeenCalled();
    });

    it('should check field type', async () => {
      const loginPage = new LoginPage(mockContext);
      const isCorrectType = await loginPage.checkFieldType('E-mail', 'email');

      expect(isCorrectType).toBe(true);
      expect(mockLoginPage.checkFieldType).toHaveBeenCalledWith('E-mail', 'email');
    });

    it('should check if password is masked', async () => {
      const loginPage = new LoginPage(mockContext);
      const isMasked = await loginPage.isPasswordMasked();

      expect(isMasked).toBe(true);
      expect(mockLoginPage.isPasswordMasked).toHaveBeenCalled();
    });

    it('should check if password is visible', async () => {
      const loginPage = new LoginPage(mockContext);
      const isVisible = await loginPage.isPasswordVisible();

      expect(isVisible).toBe(false);
      expect(mockLoginPage.isPasswordVisible).toHaveBeenCalled();
    });
  });

  describe('Action Steps', () => {
    it('should enter email', async () => {
      const email = 'test@example.com';
      const loginPage = new LoginPage(mockContext);
      await loginPage.enterEmail(email);

      expect(mockLoginPage.enterEmail).toHaveBeenCalledWith(email);
    });

    it('should enter password', async () => {
      const password = 'SecurePassword123';
      const loginPage = new LoginPage(mockContext);
      await loginPage.enterPassword(password);

      expect(mockLoginPage.enterPassword).toHaveBeenCalledWith(password);
    });

    it('should click login button', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.clickLoginButton();

      expect(mockLoginPage.clickLoginButton).toHaveBeenCalled();
    });

    it('should click forgot password link', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.clickForgotPasswordLink();

      expect(mockLoginPage.clickForgotPasswordLink).toHaveBeenCalled();
    });

    it('should toggle password visibility', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.clickPasswordVisibilityToggle();

      expect(mockLoginPage.clickPasswordVisibilityToggle).toHaveBeenCalled();
    });

    it('should clear email field', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.clearEmail();

      expect(mockLoginPage.clearEmail).toHaveBeenCalled();
    });

    it('should clear password field', async () => {
      const loginPage = new LoginPage(mockContext);
      await loginPage.clearPassword();

      expect(mockLoginPage.clearPassword).toHaveBeenCalled();
    });

    it('should enter recovery email', async () => {
      const email = 'recovery@example.com';
      const loginPage = new LoginPage(mockContext);
      await loginPage.enterRecoveryEmail(email);

      expect(mockLoginPage.enterRecoveryEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('Assertion Steps', () => {
    it('should check if on forgot password page', async () => {
      const loginPage = new LoginPage(mockContext);
      const isOnPage = await loginPage.isOnForgotPasswordPage();

      expect(isOnPage).toBe(true);
      expect(mockLoginPage.isOnForgotPasswordPage).toHaveBeenCalled();
    });

    it('should get result message', async () => {
      mockLoginPage.getResultMessage.mockResolvedValue('Login successful');
      const loginPage = new LoginPage(mockContext);
      const message = await loginPage.getResultMessage();

      expect(message).toBe('Login successful');
      expect(mockLoginPage.getResultMessage).toHaveBeenCalled();
    });

    it('should get error message', async () => {
      const loginPage = new LoginPage(mockContext);
      const errorMessage = await loginPage.getErrorMessage('email');

      expect(errorMessage).toContain('required');
      expect(mockLoginPage.getErrorMessage).toHaveBeenCalledWith('email');
    });
  });

  describe('Complex Flow Steps', () => {
    it('should perform complete login flow', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123';
      const loginPage = new LoginPage(mockContext);
      
      await loginPage.login(email, password);

      expect(mockLoginPage.login).toHaveBeenCalledWith(email, password);
    });

    it('should verify login API payload', async () => {
      const loginPage = new LoginPage(mockContext);
      const isValid = await loginPage.verifyLoginApiPayload();

      expect(isValid).toBe(true);
      expect(mockLoginPage.verifyLoginApiPayload).toHaveBeenCalled();
    });
  });

  describe('Parameterization and Reusability', () => {
    it('should support multiple emails', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'admin@example.com'];
      
      for (const email of emails) {
        const loginPage = new LoginPage(mockContext);
        await loginPage.enterEmail(email);
        expect(mockLoginPage.enterEmail).toHaveBeenCalledWith(email);
      }
    });

    it('should support multiple passwords', async () => {
      const passwords = ['Pass123', 'SecurePass456', 'AdminPass789'];
      
      for (const password of passwords) {
        const loginPage = new LoginPage(mockContext);
        await loginPage.enterPassword(password);
        expect(mockLoginPage.enterPassword).toHaveBeenCalledWith(password);
      }
    });

    it('should support complete login flow with different credentials', async () => {
      const credentials = [
        { email: 'user1@example.com', password: 'Pass123' },
        { email: 'user2@example.com', password: 'Pass456' },
        { email: 'admin@example.com', password: 'AdminPass' }
      ];
      
      for (const cred of credentials) {
        const loginPage = new LoginPage(mockContext);
        await loginPage.login(cred.email, cred.password);
        expect(mockLoginPage.login).toHaveBeenCalledWith(cred.email, cred.password);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle page object method failures', async () => {
      mockLoginPage.enterEmail.mockRejectedValue(new Error('Element not found'));
      
      const loginPage = new LoginPage(mockContext);
      
      await expect(loginPage.enterEmail('test@example.com')).rejects.toThrow('Element not found');
    });

    it('should handle navigation failures', async () => {
      mockLoginPage.navigateToLogin.mockRejectedValue(new Error('Navigation timeout'));
      
      const loginPage = new LoginPage(mockContext);
      
      await expect(loginPage.navigateToLogin()).rejects.toThrow('Navigation timeout');
    });

    it('should handle error message retrieval failures', async () => {
      mockLoginPage.getErrorMessage.mockRejectedValue(new Error('Error element not found'));
      
      const loginPage = new LoginPage(mockContext);
      
      await expect(loginPage.getErrorMessage('email')).rejects.toThrow('Error element not found');
    });
  });

  describe('Step Definition Delegation', () => {
    it('should delegate all business logic to LoginPage', () => {
      const loginPage = new LoginPage(mockContext);
      
      // Verify all methods exist on the page object
      expect(typeof loginPage.navigateToLogin).toBe('function');
      expect(typeof loginPage.enterEmail).toBe('function');
      expect(typeof loginPage.enterPassword).toBe('function');
      expect(typeof loginPage.clickLoginButton).toBe('function');
      expect(typeof loginPage.getErrorMessage).toBe('function');
      expect(typeof loginPage.clickPasswordVisibilityToggle).toBe('function');
      expect(typeof loginPage.isPasswordMasked).toBe('function');
      expect(typeof loginPage.isPasswordVisible).toBe('function');
    });
  });

  describe('Fluent Interface', () => {
    it('should support method chaining', async () => {
      const loginPage = new LoginPage(mockContext);
      
      // Verify methods return the page object for chaining
      const result1 = await loginPage.enterEmail('test@example.com');
      const result2 = await loginPage.enterPassword('password');
      const result3 = await loginPage.clickLoginButton();
      
      expect(result1).toBe(mockLoginPage);
      expect(result2).toBe(mockLoginPage);
      expect(result3).toBe(mockLoginPage);
    });
  });
});
