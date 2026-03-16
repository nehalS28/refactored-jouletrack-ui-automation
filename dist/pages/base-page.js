/**
 * BasePage class for the UI automation framework.
 * Provides common functionality for all page objects including navigation,
 * wait methods, and element interactions with fluent interface support.
 *
 * @module pages/base-page
 * @requirements 2.2, 2.5
 */
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
export class BasePage {
    /**
     * The TestContext providing access to all framework services.
     * Worker-scoped to ensure parallel test isolation.
     */
    context;
    /**
     * WebDriver instance for direct browser interactions.
     * Prefer using actions helper for most operations.
     */
    driver;
    /**
     * Action helper for common UI interactions.
     * Provides automatic wait strategies and retry logic.
     */
    actions;
    /**
     * Wait strategy for element synchronization.
     * Supports various wait conditions (visible, clickable, etc.).
     */
    wait;
    /**
     * Structured logger for consistent logging.
     * Includes correlation IDs for tracing.
     */
    logger;
    /**
     * Generated typed locators for compile-time safety.
     * Access locators via: this.locators.domain.component.element
     *
     * Note: We import locators directly from the generated module for type safety,
     * rather than using context.locators which is typed as unknown.
     */
    locators;
    /**
     * Creates a new page object instance.
     *
     * @param context - Worker-scoped TestContext providing framework services
     * @requirements 2.2
     */
    constructor(context) {
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
     * Navigates to this page's URL.
     * Combines the base URL from config with the page's URL path.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    async navigate() {
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
        return this;
    }
    /**
     * Navigates to a specific URL.
     * Use this for dynamic URLs or URLs not defined by pageUrl.
     *
     * @param url - The URL to navigate to (relative or absolute)
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    async navigateTo(url) {
        const baseUrl = this.context.config.baseUrl ?? '';
        const fullUrl = this.buildFullUrl(baseUrl, url);
        this.logger.info('Navigating to URL', {
            page: this.pageName,
            url: fullUrl,
        });
        await this.driver.get(fullUrl);
        return this;
    }
    /**
     * Waits for the page to be fully loaded.
     * Checks document.readyState and optionally waits for network idle.
     *
     * @param options - Optional configuration for page load wait
     * @returns This page instance for method chaining
     * @requirements 2.2, 2.5
     */
    async waitForPageLoad(options) {
        const timeout = options?.timeout ?? this.context.config.timeouts.pageLoad;
        const waitForNetwork = options?.waitForNetwork ?? false;
        this.logger.debug('Waiting for page load', {
            page: this.pageName,
            timeout,
            waitForNetwork,
        });
        // Wait for document ready state
        await this.wait.forCustom(async () => {
            const readyState = await this.driver.executeScript('return document.readyState');
            return readyState === 'complete' ? true : false;
        }, 'document.readyState === complete', timeout);
        // Optionally wait for network idle
        if (waitForNetwork) {
            await this.wait.forNetworkIdle(timeout);
        }
        this.logger.debug('Page load completed', {
            page: this.pageName,
        });
        return this;
    }
    /**
     * Gets the current page URL.
     *
     * @returns The current URL
     */
    async getCurrentUrl() {
        return this.driver.getCurrentUrl();
    }
    /**
     * Gets the current page title.
     *
     * @returns The page title
     */
    async getTitle() {
        return this.driver.getTitle();
    }
    /**
     * Refreshes the current page.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    async refresh() {
        this.logger.debug('Refreshing page', {
            page: this.pageName,
        });
        await this.driver.navigate().refresh();
        return this;
    }
    /**
     * Navigates back in browser history.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    async goBack() {
        this.logger.debug('Navigating back', {
            page: this.pageName,
        });
        await this.driver.navigate().back();
        return this;
    }
    /**
     * Navigates forward in browser history.
     *
     * @returns This page instance for method chaining
     * @requirements 2.5
     */
    async goForward() {
        this.logger.debug('Navigating forward', {
            page: this.pageName,
        });
        await this.driver.navigate().forward();
        return this;
    }
    /**
     * Takes a screenshot of the current page.
     *
     * @returns Base64-encoded screenshot data
     */
    async takeScreenshot() {
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
    async executeScript(script, ...args) {
        return this.driver.executeScript(script, ...args);
    }
    /**
     * Builds a full URL from base URL and path.
     * Handles both relative and absolute URLs.
     *
     * @param baseUrl - The base URL from configuration
     * @param path - The path or full URL
     * @returns The complete URL
     */
    buildFullUrl(baseUrl, path) {
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
//# sourceMappingURL=base-page.js.map