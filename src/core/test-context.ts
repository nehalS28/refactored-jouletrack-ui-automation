/**
 * Worker-scoped TestContext implementation for the UI automation framework.
 * Provides isolated context for each parallel worker ensuring no shared mutable state.
 * 
 * @module core/test-context
 * @requirements 15.2, 14.2
 */

import type { WebDriver } from 'selenium-webdriver';
import type {
  FrameworkConfig,
  StructuredLogger,
  ActionHelper,
  WaitStrategy,
  PluginManager,
  TestContext,
  TestContextFactory as ITestContextFactory,
} from '../types/index.js';
import { locators } from '../locators/generated/index.js';
import { createStructuredLogger } from './logger.js';
import { WebDriverService } from './webdriver-service.js';
import { createPluginManager, PluginManagerImpl } from '../plugins/plugin-manager.js';

/**
 * Placeholder ActionHelper implementation.
 * Will be replaced with full implementation in task 4.4.
 * 
 * @requirements 4.1, 4.2, 4.3
 */
class PlaceholderActionHelper implements ActionHelper {
  // private readonly _driver: WebDriver; // Placeholder - not used yet
  private readonly logger: StructuredLogger;

  constructor(_driver: WebDriver, logger: StructuredLogger) {
    // this._driver = driver; // Placeholder - not used yet
    this.logger = logger;
  }

  async click(): Promise<void> {
    this.logger.debug('ActionHelper click (placeholder)');
  }

  async type(): Promise<void> {
    this.logger.debug('ActionHelper type (placeholder)');
  }

  async select(): Promise<void> {
    this.logger.debug('ActionHelper select (placeholder)');
  }

  async hover(): Promise<void> {
    this.logger.debug('ActionHelper hover (placeholder)');
  }

  async dragDrop(): Promise<void> {
    this.logger.debug('ActionHelper dragDrop (placeholder)');
  }

  async scrollIntoView(): Promise<void> {
    this.logger.debug('ActionHelper scrollIntoView (placeholder)');
  }

  async clear(): Promise<void> {
    this.logger.debug('ActionHelper clear (placeholder)');
  }

  async getText(): Promise<string> {
    this.logger.debug('ActionHelper getText (placeholder)');
    return '';
  }

  async getAttribute(): Promise<string | null> {
    this.logger.debug('ActionHelper getAttribute (placeholder)');
    return null;
  }

  async isDisplayed(): Promise<boolean> {
    this.logger.debug('ActionHelper isDisplayed (placeholder)');
    return false;
  }

  async isEnabled(): Promise<boolean> {
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
class PlaceholderWaitStrategy implements WaitStrategy {
  // private readonly _driver: WebDriver; // Placeholder - not used yet
  private readonly logger: StructuredLogger;

  constructor(_driver: WebDriver, logger: StructuredLogger) {
    // this._driver = driver; // Placeholder - not used yet
    this.logger = logger;
  }

  async forVisible(): Promise<import('selenium-webdriver').WebElement> {
    this.logger.debug('WaitStrategy forVisible (placeholder)');
    throw new Error('WaitStrategy not implemented');
  }

  async forClickable(): Promise<import('selenium-webdriver').WebElement> {
    this.logger.debug('WaitStrategy forClickable (placeholder)');
    throw new Error('WaitStrategy not implemented');
  }

  async forPresent(): Promise<import('selenium-webdriver').WebElement> {
    this.logger.debug('WaitStrategy forPresent (placeholder)');
    throw new Error('WaitStrategy not implemented');
  }

  async forStale(): Promise<void> {
    this.logger.debug('WaitStrategy forStale (placeholder)');
  }

  async forNetworkIdle(): Promise<void> {
    this.logger.debug('WaitStrategy forNetworkIdle (placeholder)');
  }

  async forText(): Promise<import('selenium-webdriver').WebElement> {
    this.logger.debug('WaitStrategy forText (placeholder)');
    throw new Error('WaitStrategy not implemented');
  }

  async forCount(): Promise<import('selenium-webdriver').WebElement[]> {
    this.logger.debug('WaitStrategy forCount (placeholder)');
    return [];
  }

  async forApiResponse(): Promise<unknown> {
    this.logger.debug('WaitStrategy forApiResponse (placeholder)');
    return null;
  }

  async forAnimationComplete(): Promise<import('selenium-webdriver').WebElement> {
    this.logger.debug('WaitStrategy forAnimationComplete (placeholder)');
    throw new Error('WaitStrategy not implemented');
  }

  async forCustom<T>(): Promise<T> {
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
function createPlaceholderDriver(
  _config: FrameworkConfig,
  logger: StructuredLogger
): WebDriver {
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
        maximize: async () => {},
        minimize: async () => {},
        fullscreen: async () => {},
      }),
      setTimeouts: async () => {},
      getTimeouts: async () => ({ implicit: 0, pageLoad: 30000, script: 30000 }),
      logs: () => ({ get: async () => [] }),
      deleteAllCookies: async () => {},
    }),
    getSession: async () => ({ getId: () => 'placeholder-session' }),
  } as unknown as WebDriver;
}

/**
 * Immutable TestContext implementation.
 * Each worker gets its own isolated context instance with no shared mutable state.
 * 
 * @requirements 15.2, 14.2
 */
class ImmutableTestContext implements TestContext {
  readonly id: string;
  readonly workerId: string;
  readonly driver: WebDriver;
  readonly config: Readonly<FrameworkConfig>;
  readonly logger: StructuredLogger;
  readonly actions: ActionHelper;
  readonly wait: WaitStrategy;
  readonly locators: typeof locators;
  readonly plugins: PluginManager;
  readonly correlationId: string;

  constructor(params: {
    id: string;
    workerId: string;
    driver: WebDriver;
    config: Readonly<FrameworkConfig>;
    logger: StructuredLogger;
    actions: ActionHelper;
    wait: WaitStrategy;
    plugins: PluginManager;
    correlationId: string;
  }) {
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
 * Options for TestContextFactory configuration.
 */
export interface TestContextFactoryOptions {
  /** Use placeholder driver instead of real WebDriver (for testing) */
  usePlaceholderDriver?: boolean;
}

/**
 * Factory for creating worker-scoped TestContext instances.
 * Ensures each parallel worker gets its own isolated context with no shared mutable state.
 * 
 * @requirements 15.2, 14.2
 */
export class TestContextFactory implements ITestContextFactory {
  private readonly config: Readonly<FrameworkConfig>;
  private readonly enabledPlugins: readonly string[];
  private readonly usePlaceholderDriver: boolean;
  private readonly webDriverServices: Map<string, WebDriverService> = new Map();

  constructor(config: FrameworkConfig, options?: TestContextFactoryOptions) {
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
  async create(workerId: string): Promise<TestContext> {
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
    let driver: WebDriver;
    if (this.usePlaceholderDriver) {
      driver = createPlaceholderDriver(this.config, logger);
    } else {
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
  async dispose(context: TestContext): Promise<void> {
    context.logger.info('Disposing TestContext', { contextId: context.id });

    try {
      // Flush all plugin data
      await context.plugins.flushAll();
      context.logger.debug('Plugin data flushed');
    } catch (error) {
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
      } else {
        await context.driver.quit();
      }
      context.logger.debug('WebDriver quit successfully');
    } catch (error) {
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
  private async initializePlugins(logger: StructuredLogger): Promise<PluginManagerImpl> {
    const manager = createPluginManager(logger);

    // Log enabled plugins - actual plugin loading will be implemented in subsequent tasks
    for (const pluginName of this.enabledPlugins) {
      logger.debug('Plugin enabled', { pluginName });
    }

    return manager;
  }
}

// Export types for external use
export type { TestContext, ITestContextFactory as TestContextFactoryInterface };
