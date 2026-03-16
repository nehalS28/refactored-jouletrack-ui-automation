/**
 * Shared navigation step definitions.
 * Provides common navigation actions across all domains.
 *
 * @module steps/shared/navigation
 * @requirements 8.5, 9.2
 */
import { Given, When, Then } from '@cucumber/cucumber';
/**
 * Helper function to build full URL from base URL and path
 */
function buildFullUrl(baseUrl, path) {
    // If path is already an absolute URL, return it as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // Ensure baseUrl doesn't end with slash and path starts with slash
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}
/**
 * Verify the application is running
 * @requirements 8.5
 */
Given('the application is running', async function () {
    const baseUrl = this.context.config.baseUrl;
    expect(baseUrl).toBeDefined();
    expect(baseUrl).not.toBe('');
});
/**
 * Navigate to a specific URL path
 * @requirements 8.5, 9.2
 */
When('I navigate to {string}', async function (path) {
    const baseUrl = this.context.config.baseUrl ?? '';
    const fullUrl = buildFullUrl(baseUrl, path);
    await this.context.driver.get(fullUrl);
    this.context.logger.info('Navigated to URL', { url: fullUrl });
});
/**
 * Navigate to a specific page by name
 * @requirements 8.5, 9.2
 */
When('I go to the {string} page', async function (pageName) {
    const pathMap = {
        'login': '/login',
        'dashboard': '/dashboard',
        'reports': '/reports',
        'settings': '/settings',
        'home': '/'
    };
    const path = pathMap[pageName.toLowerCase()];
    if (!path) {
        throw new Error(`Unknown page: ${pageName}`);
    }
    const baseUrl = this.context.config.baseUrl ?? '';
    const fullUrl = buildFullUrl(baseUrl, path);
    await this.context.driver.get(fullUrl);
    this.context.logger.info('Navigated to page', { page: pageName, url: fullUrl });
});
/**
 * Verify current URL matches expected path
 * @requirements 8.5, 9.2
 */
Then('I should be on the {string} page', async function (pageName) {
    const currentUrl = await this.context.driver.getCurrentUrl();
    const pathMap = {
        'login': '/login',
        'dashboard': '/dashboard',
        'reports': '/reports',
        'settings': '/settings',
        'home': '/'
    };
    const expectedPath = pathMap[pageName.toLowerCase()];
    expect(currentUrl).toContain(expectedPath);
});
/**
 * Verify redirection to a specific page
 * @requirements 8.5, 9.2
 */
Then('I should be redirected to the {string}', async function (pageName) {
    const currentUrl = await this.context.driver.getCurrentUrl();
    expect(currentUrl).toContain(pageName.toLowerCase());
});
/**
 * Verify remaining on the current page
 * @requirements 8.5, 9.2
 */
Then('I should remain on the {string} page', async function (pageName) {
    const currentUrl = await this.context.driver.getCurrentUrl();
    expect(currentUrl).toContain(pageName.toLowerCase());
});
/**
 * Navigate back in browser history
 * @requirements 8.5, 9.2
 */
When('I go back', async function () {
    await this.context.driver.navigate().back();
    this.context.logger.debug('Navigated back in browser history');
});
/**
 * Navigate forward in browser history
 * @requirements 8.5, 9.2
 */
When('I go forward', async function () {
    await this.context.driver.navigate().forward();
    this.context.logger.debug('Navigated forward in browser history');
});
/**
 * Refresh the current page
 * @requirements 8.5, 9.2
 */
When('I refresh the page', async function () {
    await this.context.driver.navigate().refresh();
    this.context.logger.debug('Refreshed current page');
});
/**
 * Return to a specific page
 * @requirements 8.5, 9.2
 */
When('I return to the {string} page', async function (pageName) {
    const pathMap = {
        'login': '/login',
        'dashboard': '/dashboard',
        'reports': '/reports',
        'settings': '/settings',
        'home': '/'
    };
    const path = pathMap[pageName.toLowerCase()];
    if (!path) {
        throw new Error(`Unknown page: ${pageName}`);
    }
    const baseUrl = this.context.config.baseUrl ?? '';
    const fullUrl = buildFullUrl(baseUrl, path);
    await this.context.driver.get(fullUrl);
    this.context.logger.info('Returned to page', { page: pageName, url: fullUrl });
});
//# sourceMappingURL=navigation.steps.js.map