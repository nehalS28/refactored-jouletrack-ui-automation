/**
 * BasePage class for the UI automation framework.
 * Provides common functionality for all page objects including navigation,
 * wait methods, and element interactions with fluent interface support.
 *
 * @module pages/base-page
 * @requirements 2.2, 2.5
 */
import type { WebDriver } from 'selenium-webdriver';
import type { TestContext, ActionHelper, WaitStrategy, StructuredLogger } from '../types/context.types.js';
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
export declare abstract class BasePage<T extends BasePage<T> = BasePage<any>> {
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
    constructor(context: TestContext);
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
    navigate(): Promise<T>;
    /**
     * Navigates to a specific URL.
     * Use this for dynamic URLs or URLs not defined by pageUrl.
     *
     * @param url - The URL to navigate to (relative or absolute)
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    navigateTo(url: string): Promise<T>;
    /**
     * Waits for the page to be fully loaded.
     * Checks document.readyState and optionally waits for network idle.
     *
     * @param options - Optional configuration for page load wait
     * @returns This page instance for method chaining
     * @requirements 2.2, 2.5
     */
    waitForPageLoad(options?: PageLoadOptions): Promise<T>;
    /**
     * Gets the current page URL.
     *
     * @returns The current URL
     */
    getCurrentUrl(): Promise<string>;
    /**
     * Gets the current page title.
     *
     * @returns The page title
     */
    getTitle(): Promise<string>;
    /**
     * Refreshes the current page.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    refresh(): Promise<T>;
    /**
     * Navigates back in browser history.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    goBack(): Promise<T>;
    /**
     * Navigates forward in browser history.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    goForward(): Promise<T>;
    /**
     * Takes a screenshot of the current page.
     *
     * @returns Base64-encoded screenshot data
     */
    takeScreenshot(): Promise<string>;
    /**
     * Executes JavaScript in the browser context.
     *
     * @param script - JavaScript code to execute
     * @param args - Arguments to pass to the script
     * @returns The result of the script execution
     */
    executeScript<R>(script: string, ...args: unknown[]): Promise<R>;
    /**
     * Builds a full URL from base URL and path.
     * Handles both relative and absolute URLs.
     *
     * @param baseUrl - The base URL from configuration
     * @param path - The path or full URL
     * @returns The complete URL
     */
    private buildFullUrl;
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
//# sourceMappingURL=base-page.d.ts.map