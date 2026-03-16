/**
 * Plugin type definitions for the UI automation framework.
 * Provides extensible plugin architecture with lifecycle management.
 *
 * @module types/plugin
 * @requirements 14.2
 */
/**
 * Test execution status.
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';
/**
 * Step execution information.
 */
export interface StepInfo {
    /** Step identifier */
    readonly id: string;
    /** Step text/description */
    readonly text: string;
    /** Step type (Given, When, Then) */
    readonly type: 'Given' | 'When' | 'Then' | 'And' | 'But';
    /** Step execution status */
    readonly status: TestStatus;
    /** Step execution duration (milliseconds) */
    readonly duration: number;
    /** Error if step failed */
    readonly error?: Error;
    /** Screenshot path if captured */
    readonly screenshot?: string;
}
/**
 * Error context for plugin error handling.
 */
export interface ErrorContext {
    /** Test ID where error occurred */
    readonly testId?: string;
    /** Step ID where error occurred */
    readonly stepId?: string;
    /** Current page URL */
    readonly pageUrl?: string;
    /** Element state if applicable */
    readonly elementState?: string;
    /** Screenshot path if captured */
    readonly screenshot?: string;
    /** Additional context data */
    readonly data?: Record<string, unknown>;
}
/**
 * Base plugin configuration interface.
 */
export interface PluginConfig {
    /** Whether the plugin is enabled */
    readonly enabled: boolean;
    /** Additional plugin-specific configuration */
    readonly [key: string]: unknown;
}
/**
 * Plugin interface defining the lifecycle contract.
 * All plugins must implement this interface.
 *
 * @requirements 14.2
 */
export interface Plugin {
    /** Unique plugin name */
    readonly name: string;
    /** Plugin version */
    readonly version: string;
    /**
     * Initialize the plugin.
     * Called once when the plugin is loaded.
     */
    initialize(): Promise<void>;
    /**
     * Called when a test starts.
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name
     */
    onTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Called when a test ends.
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Called after each step is executed.
     * @param step - Step execution information
     */
    onStepExecuted(step: StepInfo): Promise<void>;
    /**
     * Called when an error occurs.
     * @param error - The error that occurred
     * @param context - Error context information
     */
    onError(error: Error, context: ErrorContext): Promise<void>;
    /**
     * Flush any buffered data.
     * Called periodically and before disposal.
     */
    flush(): Promise<void>;
    /**
     * Dispose the plugin and clean up resources.
     * Called when the plugin is being unloaded.
     */
    dispose(): Promise<void>;
}
/**
 * Plugin manager interface for managing plugin lifecycle.
 */
export interface PluginManager {
    /**
     * Register a plugin.
     * @param plugin - Plugin instance to register
     */
    register(plugin: Plugin): void;
    /**
     * Get a registered plugin by name.
     * @param name - Plugin name
     * @returns Plugin instance or undefined if not found
     */
    get<T extends Plugin>(name: string): T | undefined;
    /**
     * Notify all plugins of test start.
     * @param testId - Test identifier
     * @param testName - Test name
     */
    notifyTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Notify all plugins of test end.
     * @param testId - Test identifier
     * @param status - Test status
     * @param duration - Test duration
     */
    notifyTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Notify all plugins of step execution.
     * @param step - Step information
     */
    notifyStepExecuted(step: StepInfo): Promise<void>;
    /**
     * Notify all plugins of an error.
     * @param error - Error that occurred
     * @param context - Error context
     */
    notifyError(error: Error, context: ErrorContext): Promise<void>;
    /**
     * Flush all plugins.
     */
    flushAll(): Promise<void>;
    /**
     * Dispose all plugins.
     */
    disposeAll(): Promise<void>;
}
/**
 * Test metrics for performance tracking.
 *
 * @requirements 17.1, 17.2
 */
export interface TestMetrics {
    /** Test identifier */
    readonly testId: string;
    /** Test name */
    readonly testName: string;
    /** Test execution status */
    readonly status: TestStatus;
    /** Test execution duration (milliseconds) */
    readonly duration: number;
    /** Timestamp of test execution */
    readonly timestamp: Date;
    /** Worker ID that executed the test */
    readonly workerId?: string;
    /** Locator lookup metrics */
    readonly locatorMetrics: readonly LocatorMetric[];
    /** Wait operation metrics */
    readonly waitMetrics: readonly WaitMetric[];
}
/**
 * Locator lookup metric.
 *
 * @requirements 17.3
 */
export interface LocatorMetric {
    /** Locator key */
    readonly locatorKey: string;
    /** Lookup time (milliseconds) */
    readonly lookupTimeMs: number;
    /** Whether lookup was successful */
    readonly success: boolean;
}
/**
 * Wait operation metric.
 *
 * @requirements 17.6
 */
export interface WaitMetric {
    /** Wait condition type */
    readonly condition: string;
    /** Configured timeout (milliseconds) */
    readonly configuredMs: number;
    /** Actual wait time (milliseconds) */
    readonly actualMs: number;
    /** Whether wait was successful */
    readonly success: boolean;
}
/**
 * Suite metrics for aggregate reporting.
 *
 * @requirements 17.1, 17.7
 */
export interface SuiteMetrics {
    /** Suite identifier */
    readonly suiteId: string;
    /** Total number of tests */
    readonly totalTests: number;
    /** Number of passed tests */
    readonly passed: number;
    /** Number of failed tests */
    readonly failed: number;
    /** Number of skipped tests */
    readonly skipped: number;
    /** Total suite duration (milliseconds) */
    readonly totalDuration: number;
    /** Number of parallel workers used */
    readonly parallelWorkers?: number;
    /** Timestamp of suite execution */
    readonly timestamp: Date;
}
/**
 * Visual check result.
 *
 * @requirements 17.3
 */
export interface VisualCheckResult {
    /** Whether the visual check passed */
    readonly passed: boolean;
    /** Percentage of pixels that differ */
    readonly diffPercentage: number;
    /** Name of the visual check */
    readonly name: string;
    /** Whether a new baseline was created */
    readonly baselineCreated?: boolean;
}
//# sourceMappingURL=plugin.types.d.ts.map