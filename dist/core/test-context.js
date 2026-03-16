/**
 * Worker-scoped TestContext implementation for the UI automation framework.
 * Provides isolated context for each parallel worker ensuring no shared mutable state.
 *
 * @module core/test-context
 * @requirements 15.2, 14.2
 */
import { locators } from '../locators/generated/index.js';
import { createStructuredLogger } from './logger.js';
import { WebDriverService } from './webdriver-service.js';
import { createPluginManager } from '../plugins/plugin-manager.js';
/**
 * Placeholder ActionHelper implementation.
 * Will be replaced with full implementation in task 4.4.
 *
 * @requirements 4.1, 4.2, 4.3
 */
class PlaceholderActionHelper {
    driver;
    logger;
    constructor(driver, logger) {
        this.driver = driver;
        this.logger = logger;
    }
    async click() {
        this.logger.debug('ActionHelper click (placeholder)');
    }
    async type() {
        this.logger.debug('ActionHelper type (placeholder)');
    }
    async select() {
        this.logger.debug('ActionHelper select (placeholder)');
    }
    async hover() {
        this.logger.debug('ActionHelper hover (placeholder)');
    }
    async dragDrop() {
        this.logger.debug('ActionHelper dragDrop (placeholder)');
    }
    async scrollIntoView() {
        this.logger.debug('ActionHelper scrollIntoView (placeholder)');
    }
    async clear() {
        this.logger.debug('ActionHelper clear (placeholder)');
    }
    async getText() {
        this.logger.debug('ActionHelper getText (placeholder)');
        return '';
    }
    async getAttribute() {
        this.logger.debug('ActionHelper getAttribute (placeholder)');
        return null;
    }
    async isDisplayed() {
        this.logger.debug('ActionHelper isDisplayed (placeholder)');
        return false;
    }
    async isEnabled() {
        this.logger.debug('ActionHelper isEnabled (placeholder)');
        return false;
    }
}
/**
 * Placeholder WaitStrategy implementation.
 * Will be replaced with full implementation in task 4.3.
 *
 * @requirements 5.1, 5.2, 5.4
 */
class PlaceholderWaitStrategy {
    driver;
    logger;
    constructor(driver, logger) {
        this.driver = driver;
        this.logger = logger;
    }
    async forVisible() {
        this.logger.debug('WaitStrategy forVisible (placeholder)');
        throw new Error('WaitStrategy not implemented');
    }
    async forClickable() {
        this.logger.debug('WaitStrategy forClickable (placeholder)');
        throw new Error('WaitStrategy not implemented');
    }
    async forPresent() {
        this.logger.debug('WaitStrategy forPresent (placeholder)');
        throw new Error('WaitStrategy not implemented');
    }
    async forStale() {
        this.logger.debug('WaitStrategy forStale (placeholder)');
    }
    async forNetworkIdle() {
        this.logger.debug('WaitStrategy forNetworkIdle (placeholder)');
    }
    async forText() {
        this.logger.debug('WaitStrategy forText (placeholder)');
        throw new Error('WaitStrategy not implemented');
    }
    async forCount() {
        this.logger.debug('WaitStrategy forCount (placeholder)');
        return [];
    }
    async forApiResponse() {
        this.logger.debug('WaitStrategy forApiResponse (placeholder)');
        return null;
    }
    async forAnimationComplete() {
        this.logger.debug('WaitStrategy forAnimationComplete (placeholder)');
        throw new Error('WaitStrategy not implemented');
    }
    async forCustom() {
        this.logger.debug('WaitStrategy forCustom (placeholder)');
        throw new Error('WaitStrategy not implemented');
    }
}
/**
 * Placeholder WebDriver factory function.
 * Used for testing when real browser is not needed.
 *
 * @requirements 3.1, 3.4
 */
function createPlaceholderDriver(_config, logger) {
    logger.debug('Creating placeholder WebDriver');
    // Return a mock driver for testing without browser dependencies
    return {
        quit: async () => {
            logger.debug('WebDriver quit (placeholder)');
        },
        get: async () => {
            logger.debug('WebDriver get (placeholder)');
        },
        getCurrentUrl: async () => '',
        getTitle: async () => '',
        findElement: async () => {
            throw new Error('WebDriver not implemented');
        },
        findElements: async () => [],
        takeScreenshot: async () => '',
        executeScript: async () => null,
        wait: async () => null,
        manage: () => ({
            window: () => ({
                setRect: async () => ({}),
                getRect: async () => ({ x: 0, y: 0, width: 1920, height: 1080 }),
                maximize: async () => { },
                minimize: async () => { },
                fullscreen: async () => { },
            }),
            setTimeouts: async () => { },
            getTimeouts: async () => ({ implicit: 0, pageLoad: 30000, script: 30000 }),
            logs: () => ({ get: async () => [] }),
            deleteAllCookies: async () => { },
        }),
        getSession: async () => ({ getId: () => 'placeholder-session' }),
    };
}
/**
 * Immutable TestContext implementation.
 * Each worker gets its own isolated context instance with no shared mutable state.
 *
 * @requirements 15.2, 14.2
 */
class ImmutableTestContext {
    id;
    workerId;
    driver;
    config;
    logger;
    actions;
    wait;
    locators;
    plugins;
    correlationId;
    constructor(params) {
        this.id = params.id;
        this.workerId = params.workerId;
        this.driver = params.driver;
        this.config = params.config;
        this.logger = params.logger;
        this.actions = params.actions;
        this.wait = params.wait;
        this.locators = locators;
        this.plugins = params.plugins;
        this.correlationId = params.correlationId;
        // Freeze the context to prevent mutation
        Object.freeze(this);
    }
}
/**
 * Factory for creating worker-scoped TestContext instances.
 * Ensures each parallel worker gets its own isolated context with no shared mutable state.
 *
 * @requirements 15.2, 14.2
 */
export class TestContextFactory {
    config;
    enabledPlugins;
    usePlaceholderDriver;
    webDriverServices = new Map();
    constructor(config, options) {
        // Deep freeze the configuration to prevent any mutation
        this.config = Object.freeze({ ...config });
        this.enabledPlugins = Object.freeze([...(config.plugins?.enabled ?? [])]);
        this.usePlaceholderDriver = options?.usePlaceholderDriver ?? false;
    }
    /**
     * Create a new TestContext for a worker.
     * Each context is completely isolated with its own:
     * - WebDriver instance (real or placeholder based on options)
     * - Logger with unique correlation ID
     * - Action helper
     * - Wait strategy
     * - Plugin manager
     *
     * @param workerId - Unique identifier for the worker
     * @returns Promise resolving to a frozen TestContext
     */
    async create(workerId) {
        const contextId = `ctx-${workerId}-${Date.now()}`;
        const correlationId = `corr-${workerId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        // Create worker-scoped logger using the real StructuredLogger implementation
        const logger = createStructuredLogger({
            workerId,
            correlationId,
            level: this.config.logging?.level ?? 'info',
        });
        logger.info('Creating TestContext', { contextId, workerId });
        // Create worker-scoped WebDriver (real or placeholder)
        let driver;
        if (this.usePlaceholderDriver) {
            driver = createPlaceholderDriver(this.config, logger);
        }
        else {
            const webDriverService = new WebDriverService(this.config, logger);
            driver = await webDriverService.initialize();
            // Store the service for cleanup
            this.webDriverServices.set(contextId, webDriverService);
        }
        // Create worker-scoped wait strategy
        const wait = new PlaceholderWaitStrategy(driver, logger);
        // Create worker-scoped action helper
        const actions = new PlaceholderActionHelper(driver, logger);
        // Initialize plugins for this worker
        const plugins = await this.initializePlugins(logger);
        const context = new ImmutableTestContext({
            id: contextId,
            workerId,
            driver,
            config: this.config,
            logger,
            actions,
            wait,
            plugins,
            correlationId,
        });
        logger.info('TestContext created', { contextId, workerId, correlationId });
        return context;
    }
    /**
     * Dispose a TestContext and clean up all resources.
     * This method:
     * 1. Flushes all plugin data
     * 2. Quits the WebDriver (via WebDriverService if available)
     * 3. Logs disposal completion
     *
     * @param context - The TestContext to dispose
     */
    async dispose(context) {
        context.logger.info('Disposing TestContext', { contextId: context.id });
        try {
            // Flush all plugin data
            await context.plugins.flushAll();
            context.logger.debug('Plugin data flushed');
        }
        catch (error) {
            context.logger.warn('Failed to flush plugin data', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        try {
            // Quit WebDriver via service if available, otherwise directly
            const webDriverService = this.webDriverServices.get(context.id);
            if (webDriverService) {
                await webDriverService.quit();
                this.webDriverServices.delete(context.id);
            }
            else {
                await context.driver.quit();
            }
            context.logger.debug('WebDriver quit successfully');
        }
        catch (error) {
            context.logger.warn('Failed to quit WebDriver', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        context.logger.info('TestContext disposed', { contextId: context.id });
    }
    /**
     * Initialize plugins for a worker.
     * Each worker gets its own plugin instances.
     *
     * @param logger - Worker-scoped logger
     * @returns Promise resolving to a PluginManager
     */
    async initializePlugins(logger) {
        const manager = createPluginManager(logger);
        // Log enabled plugins - actual plugin loading will be implemented in subsequent tasks
        for (const pluginName of this.enabledPlugins) {
            logger.debug('Plugin enabled', { pluginName });
        }
        return manager;
    }
}
//# sourceMappingURL=test-context.js.map