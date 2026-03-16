/**
 * Unit tests for BasePage class.
 * Tests navigation methods, fluent interface, and error handling.
 * 
 * @module pages/base-page.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BasePage } from './base-page.js';
import type { TestContext, StructuredLogger, ActionHelper, WaitStrategy } from '../types/context.types.js';
import type { FrameworkConfig } from '../types/config.types.js';
import type { WebDriver, Navigation } from 'selenium-webdriver';

/**
 * Concrete implementation of BasePage for testing.
 */
class TestPage extends BasePage<TestPage> {
  readonly pageName = 'test-page';

  protected get pageUrl(): string {
    return '/test';
  }

  // Expose protected members for testing
  getContext(): TestContext {
    return this.context;
  }

  getDriver(): WebDriver {
    return this.driver;
  }

  getActions(): ActionHelper {
    return this.actions;
  }

  getWait(): WaitStrategy {
    return this.wait;
  }

  getLogger(): StructuredLogger {
    return this.logger;
  }
}

/**
 * Page with absolute URL for testing.
 */
class AbsoluteUrlPage extends BasePage<AbsoluteUrlPage> {
  readonly pageName = 'absolute-url-page';

  protected get pageUrl(): string {
    return 'https://external.example.com/page';
  }
}

/**
 * Page with path without leading slash for testing.
 */
class NoSlashPage extends BasePage<NoSlashPage> {
  readonly pageName = 'no-slash-page';

  protected get pageUrl(): string {
    return 'path/to/page';
  }
}

describe('BasePage', () => {
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
      getCurrentUrl: vi.fn().mockResolvedValue('https://example.com/test'),
      getTitle: vi.fn().mockResolvedValue('Test Page'),
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
      const page = new TestPage(mockContext);

      expect(page.getContext()).toBe(mockContext);
      expect(page.getDriver()).toBe(mockDriver);
      expect(page.getActions()).toBe(mockActions);
      expect(page.getWait()).toBe(mockWait);
      expect(page.getLogger()).toBe(mockLogger);
    });

    it('should have access to typed locators', () => {
      const page = new TestPage(mockContext);

      // Locators should be available (imported directly)
      expect(page['locators']).toBeDefined();
      expect(page['locators'].authentication).toBeDefined();
    });
  });

  describe('navigate', () => {
    it('should navigate to page URL with base URL', async () => {
      const page = new TestPage(mockContext);

      const result = await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('https://example.com/test');
      expect(result).toBe(page);
    });

    it('should log navigation', async () => {
      const page = new TestPage(mockContext);

      await page.navigate();

      expect(mockLogger.info).toHaveBeenCalledWith('Navigating to page', {
        page: 'test-page',
        url: 'https://example.com/test',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Navigation completed', {
        page: 'test-page',
      });
    });

    it('should handle absolute URLs', async () => {
      const page = new AbsoluteUrlPage(mockContext);

      await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('https://external.example.com/page');
    });

    it('should handle paths without leading slash', async () => {
      const page = new NoSlashPage(mockContext);

      await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('https://example.com/path/to/page');
    });

    it('should handle base URL with trailing slash', async () => {
      const configWithTrailingSlash: FrameworkConfig = {
        ...mockConfig,
        baseUrl: 'https://example.com/',
      };
      const contextWithTrailingSlash: TestContext = {
        ...mockContext,
        config: configWithTrailingSlash,
      };
      const page = new TestPage(contextWithTrailingSlash);

      await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('https://example.com/test');
    });

    it('should handle empty base URL', async () => {
      const configWithEmptyBase: FrameworkConfig = {
        ...mockConfig,
        baseUrl: '',
      };
      const contextWithEmptyBase: TestContext = {
        ...mockContext,
        config: configWithEmptyBase,
      };
      const page = new TestPage(contextWithEmptyBase);

      await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('/test');
    });

    it('should handle undefined base URL', async () => {
      const configWithUndefinedBase: FrameworkConfig = {
        ...mockConfig,
        baseUrl: undefined as unknown as string,
      };
      const contextWithUndefinedBase: TestContext = {
        ...mockContext,
        config: configWithUndefinedBase,
      };
      const page = new TestPage(contextWithUndefinedBase);

      await page.navigate();

      expect(mockDriver.get).toHaveBeenCalledWith('/test');
    });
  });

  describe('navigateTo', () => {
    it('should navigate to specified URL', async () => {
      const page = new TestPage(mockContext);

      const result = await page.navigateTo('/custom/path');

      expect(mockDriver.get).toHaveBeenCalledWith('https://example.com/custom/path');
      expect(result).toBe(page);
    });

    it('should handle absolute URLs', async () => {
      const page = new TestPage(mockContext);

      await page.navigateTo('https://other.example.com/page');

      expect(mockDriver.get).toHaveBeenCalledWith('https://other.example.com/page');
    });
  });

  describe('waitForPageLoad', () => {
    it('should wait for document ready state', async () => {
      const page = new TestPage(mockContext);

      const result = await page.waitForPageLoad();

      expect(mockWait.forCustom).toHaveBeenCalledWith(
        expect.any(Function),
        'document.readyState === complete',
        30000
      );
      expect(result).toBe(page);
    });

    it('should use custom timeout', async () => {
      const page = new TestPage(mockContext);

      await page.waitForPageLoad({ timeout: 5000 });

      expect(mockWait.forCustom).toHaveBeenCalledWith(
        expect.any(Function),
        'document.readyState === complete',
        5000
      );
    });

    it('should wait for network idle when requested', async () => {
      const page = new TestPage(mockContext);

      await page.waitForPageLoad({ waitForNetwork: true });

      expect(mockWait.forNetworkIdle).toHaveBeenCalledWith(30000);
    });

    it('should not wait for network idle by default', async () => {
      const page = new TestPage(mockContext);

      await page.waitForPageLoad();

      expect(mockWait.forNetworkIdle).not.toHaveBeenCalled();
    });

    it('should log page load wait', async () => {
      const page = new TestPage(mockContext);

      await page.waitForPageLoad();

      expect(mockLogger.debug).toHaveBeenCalledWith('Waiting for page load', {
        page: 'test-page',
        timeout: 30000,
        waitForNetwork: false,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Page load completed', {
        page: 'test-page',
      });
    });
  });

  describe('getCurrentUrl', () => {
    it('should return current URL', async () => {
      const page = new TestPage(mockContext);

      const url = await page.getCurrentUrl();

      expect(url).toBe('https://example.com/test');
      expect(mockDriver.getCurrentUrl).toHaveBeenCalled();
    });
  });

  describe('getTitle', () => {
    it('should return page title', async () => {
      const page = new TestPage(mockContext);

      const title = await page.getTitle();

      expect(title).toBe('Test Page');
      expect(mockDriver.getTitle).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh the page', async () => {
      const page = new TestPage(mockContext);

      const result = await page.refresh();

      expect(mockNavigation.refresh).toHaveBeenCalled();
      expect(result).toBe(page);
    });

    it('should log refresh', async () => {
      const page = new TestPage(mockContext);

      await page.refresh();

      expect(mockLogger.debug).toHaveBeenCalledWith('Refreshing page', {
        page: 'test-page',
      });
    });
  });

  describe('goBack', () => {
    it('should navigate back', async () => {
      const page = new TestPage(mockContext);

      const result = await page.goBack();

      expect(mockNavigation.back).toHaveBeenCalled();
      expect(result).toBe(page);
    });

    it('should log navigation back', async () => {
      const page = new TestPage(mockContext);

      await page.goBack();

      expect(mockLogger.debug).toHaveBeenCalledWith('Navigating back', {
        page: 'test-page',
      });
    });
  });

  describe('goForward', () => {
    it('should navigate forward', async () => {
      const page = new TestPage(mockContext);

      const result = await page.goForward();

      expect(mockNavigation.forward).toHaveBeenCalled();
      expect(result).toBe(page);
    });

    it('should log navigation forward', async () => {
      const page = new TestPage(mockContext);

      await page.goForward();

      expect(mockLogger.debug).toHaveBeenCalledWith('Navigating forward', {
        page: 'test-page',
      });
    });
  });

  describe('takeScreenshot', () => {
    it('should take screenshot', async () => {
      const page = new TestPage(mockContext);

      const screenshot = await page.takeScreenshot();

      expect(screenshot).toBe('base64screenshot');
      expect(mockDriver.takeScreenshot).toHaveBeenCalled();
    });

    it('should log screenshot', async () => {
      const page = new TestPage(mockContext);

      await page.takeScreenshot();

      expect(mockLogger.debug).toHaveBeenCalledWith('Taking screenshot', {
        page: 'test-page',
      });
    });
  });

  describe('executeScript', () => {
    it('should execute JavaScript', async () => {
      const page = new TestPage(mockContext);
      (mockDriver.executeScript as ReturnType<typeof vi.fn>).mockResolvedValue('result');

      const result = await page.executeScript<string>('return document.title');

      expect(result).toBe('result');
      expect(mockDriver.executeScript).toHaveBeenCalledWith('return document.title');
    });

    it('should pass arguments to script', async () => {
      const page = new TestPage(mockContext);

      await page.executeScript('arguments[0].click()', { element: 'test' });

      expect(mockDriver.executeScript).toHaveBeenCalledWith(
        'arguments[0].click()',
        { element: 'test' }
      );
    });
  });

  describe('fluent interface', () => {
    it('should support method chaining', async () => {
      const page = new TestPage(mockContext);

      const result = await page
        .navigate()
        .then(p => p.waitForPageLoad())
        .then(p => p.refresh());

      expect(result).toBe(page);
    });

    it('should return same instance for all navigation methods', async () => {
      const page = new TestPage(mockContext);

      const afterNavigate = await page.navigate();
      const afterWait = await afterNavigate.waitForPageLoad();
      const afterRefresh = await afterWait.refresh();
      const afterBack = await afterRefresh.goBack();
      const afterForward = await afterBack.goForward();

      expect(afterNavigate).toBe(page);
      expect(afterWait).toBe(page);
      expect(afterRefresh).toBe(page);
      expect(afterBack).toBe(page);
      expect(afterForward).toBe(page);
    });
  });
});

