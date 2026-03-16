/**
 * CLI command to generate metrics reports from SQLite database
 *
 * @module cli/commands/metrics-report
 * @requirements 17.1, 17.2, 17.4, 17.5, 17.6, 17.7
 */
/**
 * Metrics report options
 */
export interface MetricsReportOptions {
    format: 'json' | 'html' | 'console';
    days: number;
    dbPath: string;
    outputPath?: string;
}
/**
 * Performance comparison result
 */
export interface PerformanceComparison {
    testId: string;
    testName: string;
    currentDuration: number;
    baselineDuration: number;
    percentageDifference: number;
    status: 'improved' | 'regressed' | 'stable';
}
/**
 * Performance regression result
 */
export interface PerformanceRegression {
    testId: string;
    testName: string;
    currentDuration: number;
    baselineDuration: number;
    percentageSlower: number;
}
/**
 * Slow locator result
 */
export interface SlowLocator {
    locatorKey: string;
    avgLookupTimeMs: number;
    maxLookupTimeMs: number;
    occurrences: number;
}
/**
 * Wait inefficiency result
 */
export interface WaitInefficiency {
    condition: string;
    avgConfiguredMs: number;
    avgActualMs: number;
    avgWastedMs: number;
    efficiency: number;
}
/**
 * Parallel execution efficiency
 */
export interface ParallelEfficiency {
    workers: number;
    totalTests: number;
    totalDurationMs: number;
    avgTestDurationMs: number;
    efficiency: number;
}
/**
 * Metrics report result
 */
export interface MetricsReport {
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        skipped: number;
        avgDuration: number;
        dateRange: {
            from: string;
            to: string;
        };
    };
    performanceComparison: PerformanceComparison[];
    regressions: PerformanceRegression[];
    slowLocators: SlowLocator[];
    waitInefficiencies: WaitInefficiency[];
    parallelEfficiency?: ParallelEfficiency;
}
/**
 * Generate metrics report from SQLite database
 *
 * @param options - Report generation options
 * @returns Metrics report
 * @requirements 17.1, 17.2, 17.4, 17.5, 17.6, 17.7
 */
export declare function generateMetricsReport(options: MetricsReportOptions): Promise<MetricsReport>;
//# sourceMappingURL=metrics-report.d.ts.map