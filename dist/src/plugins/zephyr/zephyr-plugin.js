/**
 * ZephyrPlugin implementation for synchronizing test results with Zephyr test management.
 * Maps test scenarios to Zephyr test cases via tags and updates execution status.
 *
 * @module plugins/zephyr/zephyr-plugin
 * @requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
    enabled: true,
    baseUrl: '',
    apiToken: '',
    projectKey: '',
    batchSize: 10,
    flushIntervalMs: 5000,
};
/**
 * Default HTTP client implementation using fetch.
 */
export class FetchHttpClient {
    async post(url, data, headers) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(data),
        });
        return {
            status: response.status,
            data: await response.json().catch(() => null),
        };
    }
}
/**
 * Builder class for accumulating test execution data during test execution.
 */
class TestExecutionBuilder {
    _testId;
    _testName;
    testCaseKey = null;
    errorMessage;
    constructor(testId, testName) {
        this._testId = testId;
        this._testName = testName;
        this.testCaseKey = this.extractTestCaseKey(testName);
    }
    getTestCaseKey() {
        return this.testCaseKey;
    }
    setTestCaseKey(key) {
        this.testCaseKey = key;
    }
    setErrorMessage(message) {
        this.errorMessage = message;
    }
    /**
     * Extract Zephyr test case key from test name or tags.
     * Supports formats: @ZEPHYR-TC-123, @TC-123, @ZEPHYR:TC-123
     */
    extractTestCaseKey(testName) {
        // Pattern matches: @ZEPHYR-TC-123, @TC-123, @ZEPHYR:TC-123
        const patterns = [
            /@ZEPHYR[-:]?(TC-\d+)/i,
            /@(TC-\d+)/i,
            /\[ZEPHYR[-:]?(TC-\d+)\]/i,
            /\[(TC-\d+)\]/i,
        ];
        for (const pattern of patterns) {
            const match = testName.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }
        return null;
    }
    build(status, durationMs) {
        if (!this.testCaseKey) {
            return null;
        }
        const result = {
            testCaseKey: this.testCaseKey,
            status: this.mapStatus(status),
            executionTime: durationMs,
            ...(this.errorMessage !== undefined && { comment: this.errorMessage }),
        };
        return result;
    }
    mapStatus(status) {
        switch (status) {
            case 'passed':
                return 'Pass';
            case 'failed':
                return 'Fail';
            case 'skipped':
                return 'Not Executed';
            case 'pending':
                return 'Blocked';
            default:
                return 'Not Executed';
        }
    }
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
export class ZephyrPlugin {
    name = 'zephyr';
    version = '1.0.0';
    config;
    logger;
    httpClient;
    currentTest = null;
    pendingExecutions = [];
    flushTimer = null;
    constructor(config, logger, httpClient) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = logger;
        this.httpClient = httpClient ?? new FetchHttpClient();
    }
    /**
     * Initialize the plugin.
     */
    async initialize() {
        if (!this.config.enabled) {
            this.logger.info('Zephyr plugin disabled');
            return;
        }
        if (!this.config.baseUrl || !this.config.apiToken || !this.config.projectKey) {
            this.logger.warn('Zephyr plugin not configured properly', {
                hasBaseUrl: !!this.config.baseUrl,
                hasApiToken: !!this.config.apiToken,
                hasProjectKey: !!this.config.projectKey,
            });
            return;
        }
        // Start periodic flush timer
        this.startFlushTimer();
        this.logger.info('Zephyr plugin initialized', {
            baseUrl: this.config.baseUrl,
            projectKey: this.config.projectKey,
            batchSize: this.config.batchSize,
            cycleId: this.config.cycleId,
            folderId: this.config.folderId,
        });
    }
    /**
     * Called when a test starts.
     * Creates a new execution builder for the test.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name (may contain Zephyr tags)
     */
    async onTestStart(testId, testName) {
        this.currentTest = new TestExecutionBuilder(testId, testName);
        const testCaseKey = this.currentTest.getTestCaseKey();
        if (testCaseKey) {
            this.logger.debug('Zephyr test case mapped', { testId, testName, testCaseKey });
        }
        else {
            this.logger.debug('No Zephyr test case tag found', { testId, testName });
        }
    }
    /**
     * Called when a test ends.
     * Queues the test execution for batch update to Zephyr.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    async onTestEnd(testId, status, duration) {
        if (!this.currentTest) {
            this.logger.warn('No current Zephyr test execution', { testId });
            return;
        }
        const execution = this.currentTest.build(status, duration);
        if (execution) {
            this.pendingExecutions.push(execution);
            this.logger.debug('Zephyr execution queued', {
                testCaseKey: execution.testCaseKey,
                status: execution.status,
                queueSize: this.pendingExecutions.length,
            });
            // Flush if batch size reached
            if (this.pendingExecutions.length >= this.config.batchSize) {
                await this.flush();
            }
        }
        this.currentTest = null;
    }
    /**
     * Called after each step is executed.
     * Currently not used for Zephyr integration.
     *
     * @param step - Step execution information
     */
    async onStepExecuted(step) {
        // Zephyr doesn't track individual steps, only test-level results
        this.logger.debug('Step executed (not tracked in Zephyr)', {
            stepId: step.id,
            status: step.status,
        });
    }
    /**
     * Called when an error occurs.
     * Records error message for inclusion in Zephyr execution comment.
     *
     * @param error - The error that occurred
     * @param context - Error context information
     */
    async onError(error, context) {
        if (this.currentTest) {
            this.currentTest.setErrorMessage(error.message);
            this.logger.debug('Error recorded for Zephyr execution', {
                testId: context.testId,
                error: error.message,
            });
        }
    }
    /**
     * Set the Zephyr test case key for the current test.
     * Useful when the test case key is determined programmatically.
     *
     * @param testCaseKey - Zephyr test case key (e.g., TC-123)
     * @requirements 12.1
     */
    setTestCaseKey(testCaseKey) {
        if (this.currentTest) {
            this.currentTest.setTestCaseKey(testCaseKey);
            this.logger.debug('Zephyr test case key set', { testCaseKey });
        }
    }
    /**
     * Get the number of pending executions in the queue.
     *
     * @returns Number of pending executions
     */
    getPendingCount() {
        return this.pendingExecutions.length;
    }
    /**
     * Flush pending executions to Zephyr.
     * Sends batch update and clears the queue.
     * Continues test execution even if Zephyr sync fails.
     *
     * @requirements 12.4, 12.5
     */
    async flush() {
        if (this.pendingExecutions.length === 0) {
            this.logger.debug('No pending Zephyr executions to flush');
            return;
        }
        if (!this.config.enabled || !this.config.baseUrl || !this.config.apiToken) {
            this.logger.debug('Zephyr plugin not configured, skipping flush');
            this.pendingExecutions.length = 0;
            return;
        }
        const executionsToSend = [...this.pendingExecutions];
        this.pendingExecutions.length = 0;
        try {
            await this.sendBatchUpdate(executionsToSend);
            this.logger.info('Zephyr executions synced', {
                count: executionsToSend.length,
            });
        }
        catch (error) {
            // Log error but don't throw - continue test execution
            this.logger.warn('Zephyr sync failed, continuing test execution', {
                error: error instanceof Error ? error.message : String(error),
                executionCount: executionsToSend.length,
            });
        }
    }
    /**
     * Dispose the plugin and clean up resources.
     * Flushes any remaining pending executions.
     */
    async dispose() {
        this.stopFlushTimer();
        // Flush any remaining executions
        if (this.pendingExecutions.length > 0) {
            await this.flush();
        }
        this.currentTest = null;
        this.logger.info('Zephyr plugin disposed');
    }
    /**
     * Send batch update to Zephyr API.
     *
     * @param executions - Array of test executions to send
     * @requirements 12.2, 12.5, 12.6
     */
    async sendBatchUpdate(executions) {
        const url = `${this.config.baseUrl}/rest/api/2/testexecutions`;
        const payload = {
            projectKey: this.config.projectKey,
            cycleId: this.config.cycleId,
            folderId: this.config.folderId,
            executions: executions.map(exec => ({
                testCaseKey: exec.testCaseKey,
                status: exec.status,
                executionTime: exec.executionTime,
                comment: exec.comment,
            })),
        };
        const headers = {
            'Authorization': `Bearer ${this.config.apiToken}`,
        };
        this.logger.debug('Sending Zephyr batch update', {
            url,
            executionCount: executions.length,
        });
        const response = await this.httpClient.post(url, payload, headers);
        if (response.status >= 400) {
            throw new Error(`Zephyr API error: ${response.status}`);
        }
    }
    /**
     * Start the periodic flush timer.
     */
    startFlushTimer() {
        if (this.config.flushIntervalMs > 0) {
            this.flushTimer = setInterval(() => {
                this.flush().catch(err => {
                    this.logger.warn('Periodic Zephyr flush failed', {
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            }, this.config.flushIntervalMs);
        }
    }
    /**
     * Stop the periodic flush timer.
     */
    stopFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
//# sourceMappingURL=zephyr-plugin.js.map