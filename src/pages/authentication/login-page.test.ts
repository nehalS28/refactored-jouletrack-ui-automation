/**
 * Unit tests for LoginPage class.
 * Tests business actions, fluent interface, and error handling.
 *
 * @module pages/authentication/login-page.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoginPage } from './login-page.js';
import type {
  TestContext,
  StructuredLogger,
  ActionHelper,
  WaitStrategy,
} from '../../types/context.types.js';
import type { FrameworkConfig } from '../../types/config.types.js';
import type { WebDriver, Navigation } from 'selenium-webdriver';

describe('LoginPage', () => {
  let mockDriver: WebDriver;
  let mockNavigation: Navigation;
  let mockLogger: StructuredLogger;
  let mockActions: ActionHelper;
  let mockWait: WaitStrategy;
  let mockConfig: FrameworkConfig;
  let mockContext: TestContext;

  beforeEach(() => {
    // Create mock navigation
    mockNavigation = {
      refresh: vi.fn().mockResolvedValue(undefined),
      back: vi.fn().mockResolvedValue(undefined),
      forward: vi.fn().mockResolvedValue(undefined),
      to: vi.fn().mockResolvedValue(undefined),
    } as unknown as Navigation;

    // Create mock driver
    mockDriver = {
      get: vi.fn().mockResolvedValue(undefined),
      getCurrentUrl: vi.fn().mockResolvedValue('https://example.com/login'),
      getTitle: vi.fn().mockResolvedValue('Login Page'),
      navigate: vi.fn().mockReturnValue(mockNavigation),
      takeScreenshot: vi.fn().mockResolvedValue('base64screenshot'),
      executeScript: vi.fn().mockResolvedValue('complete'),
      quit: vi.fn().mockResolvedValue(undefined),
    } as unknown as WebDriver;

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setTestId: vi.fn(),
      clearTestId: vi.fn(),
    };

    // Create mock actions
    mockActions = {
      click: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockResolvedValue(undefined),
      hover: vi.fn().mockResolvedValue(undefined),
      dragDrop: vi.fn().mockResolvedValue(undefined),
      scrollIntoView: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getText: vi.fn().mockResolvedValue(''),
      getAttribute: vi.fn().mockResolvedValue(null),
      isDisplayed: vi.fn().mockResolvedValue(true),
      isEnabled: vi.fn().mockResolvedValue(true),
    };

    // Create mock wait strategy
    mockWait = {
      forVisible: vi.fn().mockResolvedValue({}),
      forClickable: vi.fn().mockResolvedValue({}),
      forPresent: vi.fn().mockResolvedValue({}),
      forStale: vi.fn().mockResolvedValue(undefined),
      forNetworkIdle: vi.fn().mockResolvedValue(undefined),
      forText: vi.fn().mockResolvedValue({}),
      forCount: vi.fn().mockResolvedValue([]),
      forApiResponse: vi.fn().mockResolvedValue({}),
      forAnimationComplete: vi.fn().mockResolvedValue({}),
      forCustom: vi.fn().mockResolvedValue(true),
    };

    // Create mock config
    mockConfig = {
      environment: 'local',
      baseUrl: 'https://example.com',
      browser: {
        name: 'chrome',
        headless: true,
        windowSize: { width: 1920, height: 1080 },
        args: [],
      },
      timeouts: {
        implicit: 0,
        explicit: 10000,
        pageLoad: 30000,
        script: 30000,
        polling: 500,
      },
      retry: {
        maxAttempts: 3,
        backoffMs: 100,
        backoffMultiplier: 2,
      },
      parallel: {
        enabled: false,
        workers: 1,
      },
      logging: {
        level: 'info',
        structured: true,
      },
    };

    // Create mock context
    mockContext = {
      id: 'ctx-test-123',
      workerId: 'worker-1',
      driver: mockDriver,
      config: mockConfig,
      logger: mockLogger,
      actions: mockActions,
      wait: mockWait,
      locators: {},
      plugins: {
        register: vi.fn(),
        get: vi.fn(),
        notifyTestStart: vi.fn(),
        notifyTestEnd: vi.fn(),
        notifyStepExecuted: vi.fn(),
        notifyError: vi.fn(),
        flushAll: vi.fn(),
        disposeAll: vi.fn(),
      },
      correlationId: 'corr-test-123',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with TestContext', () => {
      const page = new LoginPage(mockContext);

      expect(page.pageName).toBe('login-page');
    });

    it('should have access to typed locators', () => {
      const page = new LoginPage(mockContext);

      // Locators should be available (imported directly from generated module)
      expect(page['locators']).toBeDefined();
      expect(page['locators'].authentication).toBeDefined();
      expect(page['locators'].authentication.loginForm).toBeDefined();
    });
  });

  describe('navigate', () => {
    it('should navigate to /login', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('https://example.com/login');
      expect(result).toBe(page);
    });
  });

  describe('enterUsername', () => {
    it('should type username into username input field', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.enterUsername('testuser');

      expect(mockActions.type).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[data-testid='username-input']",
          strategy: 'data-testid',
        }),
        'testuser'
      );
      expect(result).toBe(page);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.enterUsername('testuser');

      expect(mockLogger.debug).toHaveBeenCalledWith('Entering username', {
        page: 'login-page',
      });
    });

    it('should return this for method chaining', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.enterUsername('testuser');

      expect(result).toBe(page);
    });
  });

  describe('enterPassword', () => {
    it('should type password into password input field', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.enterPassword('secret123');

      expect(mockActions.type).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[data-testid='password-input']",
          strategy: 'data-testid',
        }),
        'secret123'
      );
      expect(result).toBe(page);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.enterPassword('secret123');

      expect(mockLogger.debug).toHaveBeenCalledWith('Entering password', {
        page: 'login-page',
      });
    });

    it('should return this for method chaining', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.enterPassword('secret123');

      expect(result).toBe(page);
    });
  });

  describe('submitLogin', () => {
    it('should click the submit button', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.submitLogin();

      expect(mockActions.click).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "button[type='submit']",
          strategy: 'css',
        })
      );
      expect(result).toBe(page);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.submitLogin();

      expect(mockLogger.debug).toHaveBeenCalledWith('Submitting login form', {
        page: 'login-page',
      });
    });

    it('should return this for method chaining', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.submitLogin();

      expect(result).toBe(page);
    });
  });

  describe('login', () => {
    it('should perform complete login flow', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.login('testuser', 'secret123');

      // Verify all actions were called in order
      expect(mockActions.type).toHaveBeenCalledTimes(2);
      expect(mockActions.type).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          selector: "[data-testid='username-input']",
        }),
        'testuser'
      );
      expect(mockActions.type).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          selector: "[data-testid='password-input']",
        }),
        'secret123'
      );
      expect(mockActions.click).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "button[type='submit']",
        })
      );
      expect(result).toBe(page);
    });

    it('should log the login action', async () => {
      const page = new LoginPage(mockContext);

      await page.login('testuser', 'secret123');

      expect(mockLogger.info).toHaveBeenCalledWith('Performing login', {
        page: 'login-page',
      });
    });

    it('should return this for method chaining', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.login('testuser', 'secret123');

      expect(result).toBe(page);
    });
  });

  describe('getErrorMessage', () => {
    it('should get error message text', async () => {
      const page = new LoginPage(mockContext);
      (mockActions.getText as ReturnType<typeof vi.fn>).mockResolvedValue(
        'Invalid credentials'
      );

      const result = await page.getErrorMessage();

      expect(mockActions.getText).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[role='alert']",
          strategy: 'aria-label',
        })
      );
      expect(result).toBe('Invalid credentials');
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.getErrorMessage();

      expect(mockLogger.debug).toHaveBeenCalledWith('Getting error message', {
        page: 'login-page',
      });
    });
  });

  describe('isErrorDisplayed', () => {
    it('should return true when error message is visible', async () => {
      const page = new LoginPage(mockContext);
      (mockWait.forVisible as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await page.isErrorDisplayed();

      expect(mockWait.forVisible).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[role='alert']",
          strategy: 'aria-label',
        }),
        2000
      );
      expect(result).toBe(true);
    });

    it('should return false when error message is not visible', async () => {
      const page = new LoginPage(mockContext);
      (mockWait.forVisible as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Timeout')
      );

      const result = await page.isErrorDisplayed();

      expect(result).toBe(false);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.isErrorDisplayed();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Checking if error is displayed',
        {
          page: 'login-page',
        }
      );
    });
  });

  describe('togglePasswordVisibility', () => {
    it('should click the password visibility toggle', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.togglePasswordVisibility();

      expect(mockActions.click).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[data-testid='password-toggle']",
          strategy: 'data-testid',
        })
      );
      expect(result).toBe(page);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.togglePasswordVisibility();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Toggling password visibility',
        {
          page: 'login-page',
        }
      );
    });

    it('should return this for method chaining', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.togglePasswordVisibility();

      expect(result).toBe(page);
    });
  });

  describe('toggleRememberMe', () => {
    it('should click the remember me checkbox', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.toggleRememberMe();

      expect(mockActions.click).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[data-testid='remember-me']",
          strategy: 'data-testid',
        })
      );
      expect(result).toBe(page);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.toggleRememberMe();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Toggling remember me checkbox',
        {
          page: 'login-page',
        }
      );
    });

    it('should return this for method chaining', async () => {
      const page = new LoginPage(mockContext);

      const result = await page.toggleRememberMe();

      expect(result).toBe(page);
    });
  });

  describe('isRememberMeChecked', () => {
    it('should return true when checkbox is checked', async () => {
      const page = new LoginPage(mockContext);
      (mockActions.getAttribute as ReturnType<typeof vi.fn>).mockResolvedValue(
        'true'
      );

      const result = await page.isRememberMeChecked();

      expect(mockActions.getAttribute).toHaveBeenCalledWith(
        expect.objectContaining({
          selector: "[data-testid='remember-me']",
          strategy: 'data-testid',
        }),
        'checked'
      );
      expect(result).toBe(true);
    });

    it('should return false when checkbox is not checked', async () => {
      const page = new LoginPage(mockContext);
      (mockActions.getAttribute as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );

      const result = await page.isRememberMeChecked();

      expect(result).toBe(false);
    });

    it('should log the action', async () => {
      const page = new LoginPage(mockContext);

      await page.isRememberMeChecked();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Checking if remember me is checked',
        {
          page: 'login-page',
        }
      );
    });
  });

  describe('fluent interface', () => {
    it('should support method chaining for login flow', async () => {
      const page = new LoginPage(mockContext);

      const result = await page
        .enterUsername('testuser')
        .then((p) => p.enterPassword('secret123'))
        .then((p) => p.submitLogin());

      expect(result).toBe(page);
    });

    it('should support method chaining with navigate', async () => {
      const page = new LoginPage(mockContext);

      const result = await page
        .navigate()
        .then((p) => p.login('testuser', 'secret123'));

      expect(result).toBe(page);
    });

    it('should support method chaining with toggles', async () => {
      const page = new LoginPage(mockContext);

      const result = await page
        .toggleRememberMe()
        .then((p) => p.togglePasswordVisibility())
        .then((p) => p.enterUsername('testuser'));

      expect(result).toBe(page);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from actions', async () => {
      const page = new LoginPage(mockContext);
      const error = new Error('Element not found');
      (mockActions.type as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(page.enterUsername('testuser')).rejects.toThrow(
        'Element not found'
      );
    });

    it('should propagate errors from click actions', async () => {
      const page = new LoginPage(mockContext);
      const error = new Error('Element not clickable');
      (mockActions.click as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(page.submitLogin()).rejects.toThrow('Element not clickable');
    });

    it('should propagate errors from getText', async () => {
      const page = new LoginPage(mockContext);
      const error = new Error('Element not found');
      (mockActions.getText as ReturnType<typeof vi.fn>).mockRejectedValue(
        error
      );

      await expect(page.getErrorMessage()).rejects.toThrow('Element not found');
    });
  });
});
