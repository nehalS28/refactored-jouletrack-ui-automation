/**
 * SQLite database wrapper for metrics persistence.
 * Provides storage for test metrics, suite metrics, and baselines.
 *
 * @module plugins/metrics/sqlite-store
 * @requirements 17.1, 17.2, 17.4, 17.5
 */
import type { TestStatus } from '../plugin.types.js';
/**
 * Locator metric data structure.
 */
export interface LocatorMetricData {
    readonly locatorKey: string;
    readonly lookupTimeMs: number;
    readonly success: boolean;
}
/**
 * Wait metric data structure.
 */
export interface WaitMetricData {
    readonly condition: string;
    readonly configuredMs: number;
    readonly actualMs: number;
    readonly success: boolean;
}
/**
 * Test metrics data structure for storage.
 */
export interface TestMetricRecord {
    readonly testId: string;
    readonly testName: string;
    readonly status: TestStatus;
    readonly durationMs: number;
    readonly workerId?: string;
    readonly locatorMetrics: readonly LocatorMetricData[];
    readonly waitMetrics: readonly WaitMetricData[];
}
/**
 * Suite metrics data structure for storage.
 */
export interface SuiteMetricRecord {
    readonly suiteId: string;
    readonly totalTests: number;
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly totalDurationMs: number;
    readonly parallelWorkers?: number;
}
/**
 * Baseline data structure.
 */
export interface BaselineRecord {
    readonly testId: string;
    readonly avgDurationMs: number;
    readonly sampleCount: number;
    readonly updatedAt: string;
}
/**
 * SQLite store configuration.
 */
export interface SQLiteStoreConfig {
    readonly dbPath: string;
}
/**
 * SQLite database wrapper for metrics persistence.
 *
 * @requirements 17.1, 17.2, 17.4, 17.5
 */
export declare class SQLiteStore {
    private db;
    private readonly dbPath;
    private pendingWrites;
    private readonly batchSize;
    constructor(config: SQLiteStoreConfig);
    /**
     * Initialize the database and create tables.
     */
    initialize(): Promise<void>;
    /**
     * Create database tables if they don't exist.
     */
    private createTables;
    /**
     * Save test metrics to the database.
     * Uses batching for performance optimization.
     *
     * @param metrics - Test metrics to save
     */
    saveTestMetric(metrics: TestMetricRecord): Promise<void>;
    /**
     * Flush pending test metrics to the database.
     */
    private flushTestMetrics;
    /**
     * Save suite metrics to the database.
     *
     * @param metrics - Suite metrics to save
     */
    saveSuiteMetric(metrics: SuiteMetricRecord): Promise<void>;
    /**
     * Get baseline for a test.
     *
     * @param testId - Test identifier
     * @returns Baseline record or null if not found
     */
    getBaseline(testId: string): Promise<BaselineRecord | null>;
    /**
     * Update baseline for a test (synchronous version for transaction use).
     *
     * @param testId - Test identifier
     * @param durationMs - Test duration in milliseconds
     */
    private updateBaselineSync;
    /**
     * Update baseline for a test.
     *
     * @param testId - Test identifier
     * @param durationMs - Test duration in milliseconds
     */
    updateBaseline(testId: string, durationMs: number): Promise<void>;
    /**
     * Get historical average duration for a test.
     *
     * @param testId - Test identifier
     * @returns Average duration in milliseconds or null if no baseline exists
     */
    getHistoricalAverage(testId: string): Promise<number | null>;
    /**
     * Flush all pending writes to the database.
     */
    flush(): Promise<void>;
    /**
     * Close the database connection.
     */
    close(): Promise<void>;
    /**
     * Check if the database is initialized.
     */
    isInitialized(): boolean;
    /**
     * Get test metrics for the last N days
     *
     * @param days - Number of days to query
     * @returns Array of test metrics
     */
    getTestMetrics(days: number): Promise<any[]>;
    /**
     * Get suite metrics for the last N days
     *
     * @param days - Number of days to query
     * @returns Array of suite metrics
     */
    getSuiteMetrics(days: number): Promise<any[]>;
    /**
     * Get all baselines
     *
     * @returns Array of baseline records
     */
    getBaselines(): Promise<BaselineRecord[]>;
}
//# sourceMappingURL=sqlite-store.d.ts.map