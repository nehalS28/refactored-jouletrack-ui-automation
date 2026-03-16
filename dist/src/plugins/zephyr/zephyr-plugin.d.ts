/**
 * ZephyrPlugin implementation for synchronizing test results with Zephyr test management.
 * Maps test scenarios to Zephyr test cases via tags and updates execution status.
 *
 * @module plugins/zephyr/zephyr-plugin
 * @requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
import type { Plugin, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';
/**
 * Configuration for the ZephyrPlugin.
 */
export interface ZephyrPluginConfig {
    readonly enabled: boolean;
    readonly baseUrl: string;
    readonly apiToken: string;
    readonly projectKey: string;
    readonly cycleId?: string;
    readonly folderId?: string;
    readonly batchSize: number;
    readonly flushIntervalMs: number;
}
/**
 * HTTP client interface for making API requests.
 * Allows for easy mocking in tests.
 */
export interface HttpClient {
    post(url: string, data: unknown, headers: Record<string, string>): Promise<HttpResponse>;
}
/**
 * HTTP response interface.
 */
export interface HttpResponse {
    readonly status: number;
    readonly data: unknown;
}
/**
 * Default HTTP client implementation using fetch.
 */
export declare class FetchHttpClient implements HttpClient {
    post(url: string, data: unknown, headers: Record<string, string>): Promise<HttpResponse>;
}
/**
 * ZephyrPlugin implementation for synchronizing test results with Zephyr.
 *
 * Features:
 * - Map test scenarios to Zephyr test cases via tags (@ZEPHYR-TC-123)
 * - Update Zephyr test execution status on test completion
 * - Batch updates for performance optimization
 * - Continue test execution if Zephyr sync fails
 * - Support Zephyr cycle and folder organization
 *
 * @requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
export declare class ZephyrPlugin implements Plugin {
    readonly name = "zephyr";
    readonly version = "1.0.0";
    private readonly config;
    private readonly logger;
    private readonly httpClient;
    private currentTest;
    private readonly pendingExecutions;
    private flushTimer;
    constructor(config: Partial<ZephyrPluginConfig> | undefined, logger: StructuredLogger, httpClient?: HttpClient);
    /**
     * Initialize the plugin.
     */
    initialize(): Promise<void>;
    /**
     * Called when a test starts.
     * Creates a new execution builder for the test.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name (may contain Zephyr tags)
     */
    onTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Called when a test ends.
     * Queues the test execution for batch update to Zephyr.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Called after each step is executed.
     * Currently not used for Zephyr integration.
     *
     * @param step - Step execution information
     */
    onStepExecuted(step: StepInfo): Promise<void>;
    /**
     * Called when an error occurs.
     * Records error message for inclusion in Zephyr execution comment.
     *
     * @param error - The error that occurred
     * @param context - Error context information
     */
    onError(error: Error, context: ErrorContext): Promise<void>;
    /**
     * Set the Zephyr test case key for the current test.
     * Useful when the test case key is determined programmatically.
     *
     * @param testCaseKey - Zephyr test case key (e.g., TC-123)
     * @requirements 12.1
     */
    setTestCaseKey(testCaseKey: string): void;
    /**
     * Get the number of pending executions in the queue.
     *
     * @returns Number of pending executions
     */
    getPendingCount(): number;
    /**
     * Flush pending executions to Zephyr.
     * Sends batch update and clears the queue.
     * Continues test execution even if Zephyr sync fails.
     *
     * @requirements 12.4, 12.5
     */
    flush(): Promise<void>;
    /**
     * Dispose the plugin and clean up resources.
     * Flushes any remaining pending executions.
     */
    dispose(): Promise<void>;
    /**
     * Send batch update to Zephyr API.
     *
     * @param executions - Array of test executions to send
     * @requirements 12.2, 12.5, 12.6
     */
    private sendBatchUpdate;
    /**
     * Start the periodic flush timer.
     */
    private startFlushTimer;
    /**
     * Stop the periodic flush timer.
     */
    private stopFlushTimer;
}
//# sourceMappingURL=zephyr-plugin.d.ts.map