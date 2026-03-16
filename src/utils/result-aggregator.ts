/**
 * ResultAggregator for parallel test execution.
 * Aggregates test results and metrics from multiple parallel workers.
 * 
 * @module utils/result-aggregator
 * @requirements 15.4, 15.6
 */

/**
 * Metrics collected from a single worker.
 */
export interface WorkerMetrics {
  totalLocatorLookups: number;
  slowLocators: number;
  totalWaitTime: number;
}

/**
 * Test results from a single worker.
 */
export interface WorkerResult {
  workerId: string;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  duration: number;
  metrics: WorkerMetrics;
}

/**
 * Information about a failed worker.
 */
export interface WorkerFailure {
  workerId: string;
  error: string;
  timestamp: Date;
}

/**
 * Aggregated results from all workers.
 */
export interface AggregatedResult {
  totalWorkers: number;
  totalTests: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  totalDuration: number;
  aggregatedMetrics: WorkerMetrics;
  failedWorkers: WorkerFailure[];
  workerResults: WorkerResult[];
}

/**
 * ResultAggregator collects and aggregates test results from parallel workers.
 * 
 * Key features:
 * - Aggregates test counts (passed, failed, skipped) from all workers
 * - Combines metrics (locator lookups, wait times) across workers
 * - Tracks worker failures without affecting other workers
 * - Calculates total duration as max of all worker durations (parallel execution)
 * 
 * @requirements 15.4, 15.6
 */
export class ResultAggregator {
  private workerResults: WorkerResult[] = [];
  private failedWorkers: WorkerFailure[] = [];

  /**
   * Add results from a worker.
   * 
   * @param result - Worker result to add
   */
  addWorkerResult(result: WorkerResult): void {
    this.workerResults.push(result);
  }

  /**
   * Record a worker failure.
   * Worker failures are tracked separately and don't affect aggregation of successful workers.
   * 
   * @param workerId - ID of the failed worker
   * @param error - Error that caused the failure
   * @requirements 15.6
   */
  recordWorkerFailure(workerId: string, error: Error): void {
    this.failedWorkers.push({
      workerId,
      error: error.message,
      timestamp: new Date(),
    });
  }

  /**
   * Get aggregated results from all workers.
   * 
   * Aggregation logic:
   * - Test counts are summed across all workers
   * - Duration is the maximum of all worker durations (parallel execution)
   * - Metrics are summed across all workers
   * 
   * @returns Aggregated result
   * @requirements 15.4
   */
  getAggregatedResult(): AggregatedResult {
    const totalWorkers = this.workerResults.length;

    if (totalWorkers === 0) {
      return {
        totalWorkers: 0,
        totalTests: 0,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        totalDuration: 0,
        aggregatedMetrics: {
          totalLocatorLookups: 0,
          slowLocators: 0,
          totalWaitTime: 0,
        },
        failedWorkers: this.failedWorkers,
        workerResults: [],
      };
    }

    // Sum test counts across all workers
    const testsPassed = this.workerResults.reduce((sum, r) => sum + r.testsPassed, 0);
    const testsFailed = this.workerResults.reduce((sum, r) => sum + r.testsFailed, 0);
    const testsSkipped = this.workerResults.reduce((sum, r) => sum + r.testsSkipped, 0);
    const totalTests = testsPassed + testsFailed + testsSkipped;

    // Total duration is the max of all worker durations (parallel execution)
    const totalDuration = Math.max(...this.workerResults.map(r => r.duration));

    // Aggregate metrics across all workers
    const aggregatedMetrics: WorkerMetrics = {
      totalLocatorLookups: this.workerResults.reduce(
        (sum, r) => sum + r.metrics.totalLocatorLookups,
        0
      ),
      slowLocators: this.workerResults.reduce(
        (sum, r) => sum + r.metrics.slowLocators,
        0
      ),
      totalWaitTime: this.workerResults.reduce(
        (sum, r) => sum + r.metrics.totalWaitTime,
        0
      ),
    };

    return {
      totalWorkers,
      totalTests,
      testsPassed,
      testsFailed,
      testsSkipped,
      totalDuration,
      aggregatedMetrics,
      failedWorkers: this.failedWorkers,
      workerResults: this.workerResults,
    };
  }

  /**
   * Get individual worker results.
   * 
   * @returns Array of worker results
   */
  getWorkerResults(): WorkerResult[] {
    return [...this.workerResults];
  }

  /**
   * Reset all aggregated data.
   * Useful for running multiple test suites.
   */
  reset(): void {
    this.workerResults = [];
    this.failedWorkers = [];
  }
}
