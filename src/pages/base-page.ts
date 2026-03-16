/**
 * BasePage class for the UI automation framework.
 * Provides common functionality for all page objects including navigation,
 * wait methods, and element interactions with fluent interface support.
 * 
 * @module pages/base-page
 * @requirements 2.2, 2.5
 */

import type { WebDriver } from 'selenium-webdriver';
import type {
  TestContext,
  ActionHelper,
  WaitStrategy,
  StructuredLogger,
} from '../types/context.types.js';
import { locators } from '../locators/generated/index.js';

/**
 * Abstract base class for all page objects.
 * Provides common functionality and enforces consistent patterns across pages.
 * 
 * Page objects extending this class should:
 * - Define a unique pageName property
 * - Implement the pageUrl getter for navigation
 * - Use typed locators from the locators registry
 * - Return `this` from action methods for fluent chaining
 * 
 * @requirements 2.2, 2.5
 */
export abstract class BasePage<T extends BasePage<T> = BasePage<any>> {
  /**
   * Unique name identifier for this page.
   * Used for logging and error reporting.
   */
  abstract readonly pageName: string;

  /**
   * The TestContext providing access to all framework services.
   * Worker-scoped to ensure parallel test isolation.
   */
  protected readonly context: TestContext;

  /**
   * WebDriver instance for direct browser interactions.
   * Prefer using actions helper for most operations.
   */
  protected readonly driver: WebDriver;

  /**
   * Action helper for common UI interactions.
   * Provides automatic wait strategies and retry logic.
   */
  protected readonly actions: ActionHelper;

  /**
   * Wait strategy for element synchronization.
   * Supports various wait conditions (visible, clickable, etc.).
   */
  protected readonly wait: WaitStrategy;

  /**
   * Structured logger for consistent logging.
   * Includes correlation IDs for tracing.
   */
  protected readonly logger: StructuredLogger;

  /**
   * Generated typed locators for compile-time safety.
   * Access locators via: this.locators.domain.component.element
   * 
   * Note: We import locators directly from the generated module for type safety,
   * rather than using context.locators which is typed as unknown.
   */
  protected readonly locators: typeof locators;

  /**
   * Creates a new page object instance.
   * 
   * @param context - Worker-scoped TestContext providing framework services
   * @requirements 2.2
   */
  constructor(context: TestContext) {
    this.context = context;
    this.driver = context.driver;
    this.actions = context.actions;
    this.wait = context.wait;
    this.logger = context.logger;
    // Import locators directly for type safety
    // The context.locators is typed as unknown in the interface
    this.locators = locators;
  }

  /**
   * Gets the URL path for this page.
   * Override in subclasses to define the page's URL.
   * Can be a relative path (e.g., '/login') or absolute URL.
   */
  protected abstract get pageUrl(): string;

  /**
   * Navigates to this page's URL.
   * Combines the base URL from config with the page's URL path.
   * 
   * @returns This page instance for method chaining
   * @requirements 2.5
   */
  async navigate(): Promise<T> {
    const baseUrl = this.context.config.baseUrl ?? '';
    const fullUrl = this.buildFullUrl(baseUrl, this.pageUrl);

    this.logger.info('Navigating to page', {
      page: this.pageName,
      url: fullUrl,
    });

    await this.driver.get(fullUrl);

    this.logger.debug('Navigation completed', {
      page: this.pageName,
    });

    return this as unknown as T;
  }

  /**
   * Navigates to a specific URL.
   * Use this for dynamic URLs or URLs not defined by pageUrl.
   * 
   * @param url - The URL to navigate to (relative or absolute)
   * @returns This page instance for method chaining
   * @requirements 2.5
   */
  async navigateTo(url: string): Promise<T> {
    const baseUrl = this.context.config.baseUrl ?? '';
    const fullUrl = this.buildFullUrl(baseUrl, url);

    this.logger.info('Navigating to URL', {
      page: this.pageName,
      url: fullUrl,
    });

    await this.driver.get(fullUrl);

    return this as unknown as T;
  }

  /**
   * Waits for the page to be fully loaded.
   * Checks document.readyState and optionally waits for network idle.
   * 
   * @param options - Optional configuration for page load wait
   * @returns This page instance for method chaining
   * @requirements 2.2, 2.5
   */
  async waitForPageLoad(options?: PageLoadOptions): Promise<T> {
    const timeout = options?.timeout ?? this.context.config.timeouts.pageLoad;
    const waitForNetwork = options?.waitForNetwork ?? false;

    this.logger.debug('Waiting for page load', {
      page: this.pageName,
      timeout,
      waitForNetwork,
    });

    // Wait for document ready state
    await this.wait.forCustom(
      async () => {
        const readyState = await this.driver.executeScript<string>(
          'return document.readyState'
        );
        return readyState === 'complete' ? true : false;
      },
      'document.readyState === complete',
      timeout
    );

    // Optionally wait for network idle
    if (waitForNetwork) {
      await this.wait.forNetworkIdle(timeout);
    }

    this.logger.debug('Page load completed', {
      page: this.pageName,
    });

    return this as unknown as T;
  }

  /**
   * Gets the current page URL.
   * 
   * @returns The current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  /**
   * Gets the current page title.
   * 
   * @returns The page title
   */
  async getTitle(): Promise<string> {
    return this.driver.getTitle();
  }

  /**
   * Refreshes the current page.
   * 
   * @returns This page instance for method chaining
   * @requirements 2.5
   */
  async refresh(): Promise<T> {
    this.logger.debug('Refreshing page', {
      page: this.pageName,
    });

    await this.driver.navigate().refresh();

    return this as unknown as T;
  }

  /**
   * Navigates back in browser history.
   * 
   * @returns This page instance for method chaining
   * @requirements 2.5
   */
  async goBack(): Promise<T> {
    this.logger.debug('Navigating back', {
      page: this.pageName,
    });

    await this.driver.navigate().back();

    return this as unknown as T;
  }

  /**
   * Navigates forward in browser history.
   * 
   * @returns This page instance for method chaining
   * @requirements 2.5
   */
  async goForward(): Promise<T> {
    this.logger.debug('Navigating forward', {
      page: this.pageName,
    });

    await this.driver.navigate().forward();

    return this as unknown as T;
  }

  /**
   * Takes a screenshot of the current page.
   * 
   * @returns Base64-encoded screenshot data
   */
  async takeScreenshot(): Promise<string> {
    this.logger.debug('Taking screenshot', {
      page: this.pageName,
    });

    return this.driver.takeScreenshot();
  }

  /**
   * Executes JavaScript in the browser context.
   * 
   * @param script - JavaScript code to execute
   * @param args - Arguments to pass to the script
   * @returns The result of the script execution
   */
  async executeScript<R>(script: string, ...args: unknown[]): Promise<R> {
    return this.driver.executeScript<R>(script, ...args);
  }

  /**
   * Builds a full URL from base URL and path.
   * Handles both relative and absolute URLs.
   * 
   * @param baseUrl - The base URL from configuration
   * @param path - The path or full URL
   * @returns The complete URL
   */
  private buildFullUrl(baseUrl: string, path: string): string {
    // If path is already an absolute URL, return it as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Ensure baseUrl doesn't end with slash and path starts with slash
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${normalizedBase}${normalizedPath}`;
  }
}

/**
 * Options for waitForPageLoad method.
 */
export interface PageLoadOptions {
  /** Custom timeout in milliseconds */
  timeout?: number;
  /** Whether to also wait for network to be idle */
  waitForNetwork?: boolean;
}

