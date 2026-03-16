/**
 * Worker-scoped TestContext implementation for the UI automation framework.
 * Provides isolated context for each parallel worker ensuring no shared mutable state.
 *
 * @module core/test-context
 * @requirements 15.2, 14.2
 */
import type { FrameworkConfig, TestContext, TestContextFactory as ITestContextFactory } from '../types/index.js';
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
export declare class TestContextFactory implements ITestContextFactory {
    private readonly config;
    private readonly enabledPlugins;
    private readonly usePlaceholderDriver;
    private readonly webDriverServices;
    constructor(config: FrameworkConfig, options?: TestContextFactoryOptions);
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
    create(workerId: string): Promise<TestContext>;
    /**
     * Dispose a TestContext and clean up all resources.
     * This method:
     * 1. Flushes all plugin data
     * 2. Quits the WebDriver (via WebDriverService if available)
     * 3. Logs disposal completion
     *
     * @param context - The TestContext to dispose
     */
    dispose(context: TestContext): Promise<void>;
    /**
     * Initialize plugins for a worker.
     * Each worker gets its own plugin instances.
     *
     * @param logger - Worker-scoped logger
     * @returns Promise resolving to a PluginManager
     */
    private initializePlugins;
}
export type { TestContext, ITestContextFactory as TestContextFactoryInterface };
//# sourceMappingURL=test-context.d.ts.map