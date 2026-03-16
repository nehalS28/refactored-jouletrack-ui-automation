/**
 * MetricsPlugin implementation for tracking test performance metrics.
 * Provides SQLite-based persistence for test metrics, baselines, and performance regression detection.
 *
 * @module plugins/metrics/metrics-plugin
 * @requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.8
 */
import type { Plugin, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';
/**
 * Configuration for the MetricsPlugin.
 */
export interface MetricsPluginConfig {
    readonly enabled: boolean;
    readonly dbPath: string;
    readonly slowLocatorThresholdMs: number;
    readonly performanceRegressionThreshold: number;
}
/**
 * MetricsPlugin implementation for tracking test performance metrics.
 *
 * Features:
 * - Track test execution duration
 * - Track locator lookup times
 * - Calculate wait efficiency
 * - Detect performance regressions (>50% slower than baseline)
 * - Flag slow locators (>500ms threshold)
 * - Batch writes for performance
 *
 * @requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.8
 */
export declare class MetricsPlugin implements Plugin {
    readonly name = "metrics";
    readonly version = "1.0.0";
    private readonly store;
    private readonly config;
    private readonly logger;
    private currentTest;
    constructor(config: Partial<MetricsPluginConfig> | undefined, logger: StructuredLogger);
    /**
     * Initialize the plugin and database.
     */
    initialize(): Promise<void>;
    /**
     * Called when a test starts.
     * Creates a new metrics builder for the test.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name
     */
    onTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Called when a test ends.
     * Saves metrics and checks for performance regressions.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Called after each step is executed.
     * Currently used for logging step execution.
     *
     * @param step - Step execution information
     */
    onStepExecuted(step: StepInfo): Promise<void>;
    /**
     * Called when an error occurs.
     * Errors are captured in test metrics.
     *
     * @param error - The error that occurred
     * @param context - Error context information
     */
    onError(error: Error, context: ErrorContext): Promise<void>;
    /**
     * Record a locator lookup metric.
     * Flags slow locators that exceed the threshold.
     *
     * @param locatorKey - Locator identifier
     * @param lookupTimeMs - Lookup time in milliseconds
     * @param success - Whether the lookup was successful
     * @requirements 17.3
     */
    recordLocatorLookup(locatorKey: string, lookupTimeMs: number, success: boolean): void;
    /**
     * Record a wait operation metric.
     * Tracks wait efficiency (actual wait vs configured timeout).
     *
     * @param condition - Wait condition type
     * @param configuredMs - Configured timeout in milliseconds
     * @param actualMs - Actual wait time in milliseconds
     * @param success - Whether the wait was successful
     * @requirements 17.6
     */
    recordWaitTime(condition: string, configuredMs: number, actualMs: number, success: boolean): void;
    /**
     * Set the worker ID for the current test.
     *
     * @param workerId - Worker identifier
     */
    setWorkerId(workerId: string): void;
    /**
     * Check for performance regression against baseline.
     *
     * @param testId - Test identifier
     * @param duration - Current test duration
     * @requirements 17.5, 17.8
     */
    private checkPerformanceRegression;
    /**
     * Get the baseline for a test.
     *
     * @param testId - Test identifier
     * @returns Baseline average duration or null
     */
    getBaseline(testId: string): Promise<number | null>;
    /**
     * Flush any buffered data.
     */
    flush(): Promise<void>;
    /**
     * Dispose the plugin and clean up resources.
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=metrics-plugin.d.ts.map