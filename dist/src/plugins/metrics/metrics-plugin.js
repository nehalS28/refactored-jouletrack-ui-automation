/**
 * MetricsPlugin implementation for tracking test performance metrics.
 * Provides SQLite-based persistence for test metrics, baselines, and performance regression detection.
 *
 * @module plugins/metrics/metrics-plugin
 * @requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.8
 */
import { SQLiteStore } from './sqlite-store.js';
/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
    enabled: true,
    dbPath: '.cache/metrics.db',
    slowLocatorThresholdMs: 500,
    performanceRegressionThreshold: 0.5, // 50%
};
/**
 * Builder class for accumulating test metrics during test execution.
 */
class TestMetricsBuilder {
    testId;
    testName;
    locatorMetrics = [];
    waitMetrics = [];
    workerId;
    constructor(testId, testName) {
        this.testId = testId;
        this.testName = testName;
    }
    setWorkerId(workerId) {
        this.workerId = workerId;
    }
    addLocatorMetric(metric) {
        this.locatorMetrics.push(metric);
    }
    addWaitMetric(metric) {
        this.waitMetrics.push(metric);
    }
    build(status, durationMs) {
        return {
            testId: this.testId,
            testName: this.testName,
            status,
            durationMs,
            workerId: this.workerId,
            locatorMetrics: [...this.locatorMetrics],
            waitMetrics: [...this.waitMetrics],
        };
    }
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
export class MetricsPlugin {
    name = 'metrics';
    version = '1.0.0';
    store;
    config;
    logger;
    currentTest = null;
    constructor(config, logger) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = logger;
        this.store = new SQLiteStore({ dbPath: this.config.dbPath });
    }
    /**
     * Initialize the plugin and database.
     */
    async initialize() {
        await this.store.initialize();
        this.logger.info('Metrics plugin initialized', {
            dbPath: this.config.dbPath,
            slowLocatorThresholdMs: this.config.slowLocatorThresholdMs,
            performanceRegressionThreshold: this.config.performanceRegressionThreshold,
        });
    }
    /**
     * Called when a test starts.
     * Creates a new metrics builder for the test.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name
     */
    async onTestStart(testId, testName) {
        this.currentTest = new TestMetricsBuilder(testId, testName);
        this.logger.debug('Metrics tracking started for test', { testId, testName });
    }
    /**
     * Called when a test ends.
     * Saves metrics and checks for performance regressions.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    async onTestEnd(testId, status, duration) {
        if (!this.currentTest) {
            this.logger.warn('No current test metrics builder', { testId });
            return;
        }
        const metrics = this.currentTest.build(status, duration);
        await this.store.saveTestMetric(metrics);
        // Check for performance regression
        await this.checkPerformanceRegression(testId, duration);
        this.currentTest = null;
        this.logger.debug('Metrics saved for test', { testId, status, duration });
    }
    /**
     * Called after each step is executed.
     * Currently used for logging step execution.
     *
     * @param step - Step execution information
     */
    async onStepExecuted(step) {
        // Step metrics are tracked via recordLocatorLookup and recordWaitTime
        this.logger.debug('Step executed', {
            stepId: step.id,
            status: step.status,
            duration: step.duration
        });
    }
    /**
     * Called when an error occurs.
     * Errors are captured in test metrics.
     *
     * @param error - The error that occurred
     * @param context - Error context information
     */
    async onError(error, context) {
        this.logger.debug('Error recorded in metrics', {
            error: error.message,
            testId: context.testId
        });
    }
    /**
     * Record a locator lookup metric.
     * Flags slow locators that exceed the threshold.
     *
     * @param locatorKey - Locator identifier
     * @param lookupTimeMs - Lookup time in milliseconds
     * @param success - Whether the lookup was successful
     * @requirements 17.3
     */
    recordLocatorLookup(locatorKey, lookupTimeMs, success) {
        if (!this.currentTest) {
            return;
        }
        this.currentTest.addLocatorMetric({ locatorKey, lookupTimeMs, success });
        // Flag slow locators
        if (lookupTimeMs > this.config.slowLocatorThresholdMs) {
            this.logger.warn('Slow locator detected', {
                locator: locatorKey,
                timeMs: lookupTimeMs,
                threshold: this.config.slowLocatorThresholdMs,
            });
        }
    }
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
    recordWaitTime(condition, configuredMs, actualMs, success) {
        if (!this.currentTest) {
            return;
        }
        this.currentTest.addWaitMetric({ condition, configuredMs, actualMs, success });
        // Log wait efficiency
        const efficiency = configuredMs > 0 ? ((configuredMs - actualMs) / configuredMs * 100).toFixed(1) : '0';
        this.logger.debug('Wait recorded', {
            condition,
            configuredMs,
            actualMs,
            efficiency: `${efficiency}%`,
            success,
        });
    }
    /**
     * Set the worker ID for the current test.
     *
     * @param workerId - Worker identifier
     */
    setWorkerId(workerId) {
        if (this.currentTest) {
            this.currentTest.setWorkerId(workerId);
        }
    }
    /**
     * Check for performance regression against baseline.
     *
     * @param testId - Test identifier
     * @param duration - Current test duration
     * @requirements 17.5, 17.8
     */
    async checkPerformanceRegression(testId, duration) {
        const historical = await this.store.getHistoricalAverage(testId);
        if (historical === null) {
            // No baseline yet, this is the first run
            return;
        }
        const regressionThreshold = historical * (1 + this.config.performanceRegressionThreshold);
        if (duration > regressionThreshold) {
            const percentageSlower = ((duration - historical) / historical * 100).toFixed(1);
            this.logger.warn('Performance regression detected', {
                testId,
                currentDuration: duration,
                historicalAverage: historical,
                threshold: this.config.performanceRegressionThreshold * 100 + '%',
                percentageSlower: `${percentageSlower}%`,
            });
        }
    }
    /**
     * Get the baseline for a test.
     *
     * @param testId - Test identifier
     * @returns Baseline average duration or null
     */
    async getBaseline(testId) {
        return this.store.getHistoricalAverage(testId);
    }
    /**
     * Flush any buffered data.
     */
    async flush() {
        await this.store.flush();
        this.logger.debug('Metrics flushed');
    }
    /**
     * Dispose the plugin and clean up resources.
     */
    async dispose() {
        await this.store.close();
        this.logger.info('Metrics plugin disposed');
    }
}
//# sourceMappingURL=metrics-plugin.js.map