/**
 * CLI command to generate metrics reports from SQLite database
 * 
 * @module cli/commands/metrics-report
 * @requirements 17.1, 17.2, 17.4, 17.5, 17.6, 17.7
 */

import { SQLiteStore } from '../../src/plugins/metrics/sqlite-store.js';
import * as fs from 'fs/promises';
import * as path from 'path';

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
    dateRange: { from: string; to: string };
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
export async function generateMetricsReport(options: MetricsReportOptions): Promise<MetricsReport> {
  console.log('📊 Generating metrics report...');

  const store = new SQLiteStore({ dbPath: options.dbPath });

  try {
    await store.initialize();

    // Query metrics from database
    const testMetrics = await store.getTestMetrics(options.days);
    const suiteMetrics = await store.getSuiteMetrics(options.days);
    const baselines = await store.getBaselines();

    // Generate report
    const report = await buildReport(testMetrics, suiteMetrics, baselines, options.days);

    // Output report in requested format
    await outputReport(report, options);

    await store.close();

    console.log('✅ Metrics report generated successfully');
    return report;
  } catch (error) {
    await store.close();
    console.error('❌ Failed to generate metrics report:', error);
    throw error;
  }
}

/**
 * Build metrics report from raw data
 */
async function buildReport(
  testMetrics: any[],
  suiteMetrics: any[],
  baselines: any[],
  days: number
): Promise<MetricsReport> {
  const now = new Date();
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Calculate summary
  const summary = {
    totalTests: testMetrics.length,
    passed: testMetrics.filter(t => t.status === 'passed').length,
    failed: testMetrics.filter(t => t.status === 'failed').length,
    skipped: testMetrics.filter(t => t.status === 'skipped').length,
    avgDuration: testMetrics.length > 0 
      ? Math.round(testMetrics.reduce((sum, t) => sum + t.durationMs, 0) / testMetrics.length)
      : 0,
    dateRange: {
      from: fromDate.toISOString(),
      to: now.toISOString()
    }
  };


  // Build performance comparison
  const performanceComparison = buildPerformanceComparison(testMetrics, baselines);

  // Identify regressions (>50% slower)
  const regressions = performanceComparison
    .filter(c => c.status === 'regressed' && c.percentageDifference > 50)
    .map(c => ({
      testId: c.testId,
      testName: c.testName,
      currentDuration: c.currentDuration,
      baselineDuration: c.baselineDuration,
      percentageSlower: c.percentageDifference
    }));

  // Identify slow locators (>500ms)
  const slowLocators = identifySlowLocators(testMetrics);

  // Calculate wait inefficiencies
  const waitInefficiencies = calculateWaitInefficiencies(testMetrics);

  // Calculate parallel execution efficiency
  const parallelEfficiency = suiteMetrics.length > 0 
    ? calculateParallelEfficiency(suiteMetrics[0])
    : undefined;

  return {
    summary,
    performanceComparison,
    regressions,
    slowLocators,
    waitInefficiencies,
    parallelEfficiency
  };
}

/**
 * Build performance comparison between current and baseline
 */
function buildPerformanceComparison(
  testMetrics: any[],
  baselines: any[]
): PerformanceComparison[] {
  const baselineMap = new Map(baselines.map(b => [b.testId, b]));
  const testMap = new Map<string, any[]>();

  // Group test metrics by testId
  for (const metric of testMetrics) {
    if (!testMap.has(metric.testId)) {
      testMap.set(metric.testId, []);
    }
    testMap.get(metric.testId)!.push(metric);
  }

  const comparisons: PerformanceComparison[] = [];

  for (const [testId, metrics] of testMap.entries()) {
    const baseline = baselineMap.get(testId);
    if (!baseline) continue;

    const avgCurrent = Math.round(
      metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length
    );

    const percentageDifference = Math.round(
      ((avgCurrent - baseline.avgDurationMs) / baseline.avgDurationMs) * 100
    );

    let status: 'improved' | 'regressed' | 'stable';
    if (percentageDifference > 10) status = 'regressed';
    else if (percentageDifference < -10) status = 'improved';
    else status = 'stable';

    comparisons.push({
      testId,
      testName: metrics[0].testName,
      currentDuration: avgCurrent,
      baselineDuration: baseline.avgDurationMs,
      percentageDifference: Math.abs(percentageDifference),
      status
    });
  }

  return comparisons;
}


/**
 * Identify slow locators (>500ms threshold)
 */
function identifySlowLocators(testMetrics: any[]): SlowLocator[] {
  const locatorStats = new Map<string, { total: number; max: number; count: number }>();

  for (const metric of testMetrics) {
    if (!metric.locatorMetrics) continue;

    const locators = typeof metric.locatorMetrics === 'string'
      ? JSON.parse(metric.locatorMetrics)
      : metric.locatorMetrics;

    for (const locator of locators) {
      if (!locatorStats.has(locator.locatorKey)) {
        locatorStats.set(locator.locatorKey, { total: 0, max: 0, count: 0 });
      }

      const stats = locatorStats.get(locator.locatorKey)!;
      stats.total += locator.lookupTimeMs;
      stats.max = Math.max(stats.max, locator.lookupTimeMs);
      stats.count++;
    }
  }

  const slowLocators: SlowLocator[] = [];

  for (const [locatorKey, stats] of locatorStats.entries()) {
    const avgLookupTimeMs = Math.round(stats.total / stats.count);
    
    if (avgLookupTimeMs > 500) {
      slowLocators.push({
        locatorKey,
        avgLookupTimeMs,
        maxLookupTimeMs: stats.max,
        occurrences: stats.count
      });
    }
  }

  return slowLocators.sort((a, b) => b.avgLookupTimeMs - a.avgLookupTimeMs);
}

/**
 * Calculate wait inefficiencies
 */
function calculateWaitInefficiencies(testMetrics: any[]): WaitInefficiency[] {
  const waitStats = new Map<string, { totalConfigured: number; totalActual: number; count: number }>();

  for (const metric of testMetrics) {
    if (!metric.waitMetrics) continue;

    const waits = typeof metric.waitMetrics === 'string'
      ? JSON.parse(metric.waitMetrics)
      : metric.waitMetrics;

    for (const wait of waits) {
      if (!waitStats.has(wait.condition)) {
        waitStats.set(wait.condition, { totalConfigured: 0, totalActual: 0, count: 0 });
      }

      const stats = waitStats.get(wait.condition)!;
      stats.totalConfigured += wait.configuredMs;
      stats.totalActual += wait.actualMs;
      stats.count++;
    }
  }

  const inefficiencies: WaitInefficiency[] = [];

  for (const [condition, stats] of waitStats.entries()) {
    const avgConfiguredMs = Math.round(stats.totalConfigured / stats.count);
    const avgActualMs = Math.round(stats.totalActual / stats.count);
    const avgWastedMs = avgConfiguredMs - avgActualMs;
    const efficiency = Math.round((avgActualMs / avgConfiguredMs) * 100);

    inefficiencies.push({
      condition,
      avgConfiguredMs,
      avgActualMs,
      avgWastedMs,
      efficiency
    });
  }

  return inefficiencies.sort((a, b) => b.avgWastedMs - a.avgWastedMs);
}


/**
 * Calculate parallel execution efficiency
 */
function calculateParallelEfficiency(suiteMetric: any): ParallelEfficiency {
  const workers = suiteMetric.parallelWorkers || 1;
  const totalTests = suiteMetric.totalTests;
  const totalDurationMs = suiteMetric.totalDurationMs;
  const avgTestDurationMs = Math.round(totalDurationMs / totalTests);

  // Theoretical minimum time if perfectly parallelized
  const theoreticalMinTime = (totalTests * avgTestDurationMs) / workers;
  
  // Actual efficiency (how close we are to theoretical minimum)
  const efficiency = Math.round((theoreticalMinTime / totalDurationMs) * 100);

  return {
    workers,
    totalTests,
    totalDurationMs,
    avgTestDurationMs,
    efficiency: Math.min(efficiency, 100) // Cap at 100%
  };
}

/**
 * Output report in requested format
 */
async function outputReport(report: MetricsReport, options: MetricsReportOptions): Promise<void> {
  switch (options.format) {
    case 'json':
      await outputJsonReport(report, options.outputPath);
      break;
    case 'html':
      await outputHtmlReport(report, options.outputPath);
      break;
    case 'console':
      outputConsoleReport(report);
      break;
  }
}

/**
 * Output JSON format report
 */
async function outputJsonReport(report: MetricsReport, outputPath?: string): Promise<void> {
  const json = JSON.stringify(report, null, 2);

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, 'utf-8');
    console.log(`📄 JSON report saved to: ${outputPath}`);
  } else {
    console.log(json);
  }
}

/**
 * Output HTML format report
 */
async function outputHtmlReport(report: MetricsReport, outputPath?: string): Promise<void> {
  const html = generateHtmlReport(report);

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html, 'utf-8');
    console.log(`📄 HTML report saved to: ${outputPath}`);
  } else {
    console.log(html);
  }
}


/**
 * Generate HTML report
 */
function generateHtmlReport(report: MetricsReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Metrics Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #4CAF50;
    }
    .metric-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #4CAF50;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .status-improved { color: #4CAF50; font-weight: bold; }
    .status-regressed { color: #f44336; font-weight: bold; }
    .status-stable { color: #666; }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .error {
      background: #f8d7da;
      border-left: 4px solid #f44336;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Metrics Report</h1>
    <p><strong>Date Range:</strong> ${report.summary.dateRange.from} to ${report.summary.dateRange.to}</p>
    
    <h2>Summary</h2>
    <div class="summary">
      <div class="metric-card">
        <div class="metric-label">Total Tests</div>
        <div class="metric-value">${report.summary.totalTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Passed</div>
        <div class="metric-value" style="color: #4CAF50;">${report.summary.passed}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Failed</div>
        <div class="metric-value" style="color: #f44336;">${report.summary.failed}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Duration</div>
        <div class="metric-value">${report.summary.avgDuration}ms</div>
      </div>
    </div>

    
    ${report.regressions.length > 0 ? `
    <div class="error">
      <strong>⚠️ Performance Regressions Detected:</strong> ${report.regressions.length} test(s) are >50% slower than baseline
    </div>
    ` : ''}
    
    ${report.slowLocators.length > 0 ? `
    <div class="warning">
      <strong>⚠️ Slow Locators Detected:</strong> ${report.slowLocators.length} locator(s) exceed 500ms threshold
    </div>
    ` : ''}
    
    <h2>Performance Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Test Name</th>
          <th>Current Duration</th>
          <th>Baseline Duration</th>
          <th>Difference</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${report.performanceComparison.map(c => `
        <tr>
          <td>${c.testName}</td>
          <td>${c.currentDuration}ms</td>
          <td>${c.baselineDuration}ms</td>
          <td>${c.percentageDifference}%</td>
          <td class="status-${c.status}">${c.status.toUpperCase()}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    ${report.slowLocators.length > 0 ? `
    <h2>Slow Locators (>500ms)</h2>
    <table>
      <thead>
        <tr>
          <th>Locator Key</th>
          <th>Avg Lookup Time</th>
          <th>Max Lookup Time</th>
          <th>Occurrences</th>
        </tr>
      </thead>
      <tbody>
        ${report.slowLocators.map(l => `
        <tr>
          <td>${l.locatorKey}</td>
          <td>${l.avgLookupTimeMs}ms</td>
          <td>${l.maxLookupTimeMs}ms</td>
          <td>${l.occurrences}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    ${report.waitInefficiencies.length > 0 ? `
    <h2>Wait Inefficiencies</h2>
    <table>
      <thead>
        <tr>
          <th>Condition</th>
          <th>Avg Configured</th>
          <th>Avg Actual</th>
          <th>Avg Wasted</th>
          <th>Efficiency</th>
        </tr>
      </thead>
      <tbody>
        ${report.waitInefficiencies.map(w => `
        <tr>
          <td>${w.condition}</td>
          <td>${w.avgConfiguredMs}ms</td>
          <td>${w.avgActualMs}ms</td>
          <td>${w.avgWastedMs}ms</td>
          <td>${w.efficiency}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    ${report.parallelEfficiency ? `
    <h2>Parallel Execution Efficiency</h2>
    <div class="summary">
      <div class="metric-card">
        <div class="metric-label">Workers</div>
        <div class="metric-value">${report.parallelEfficiency.workers}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Tests</div>
        <div class="metric-value">${report.parallelEfficiency.totalTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Duration</div>
        <div class="metric-value">${Math.round(report.parallelEfficiency.totalDurationMs / 1000)}s</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Efficiency</div>
        <div class="metric-value">${report.parallelEfficiency.efficiency}%</div>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}


/**
 * Output console format report
 */
function outputConsoleReport(report: MetricsReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 METRICS REPORT');
  console.log('='.repeat(80));
  
  console.log('\n📅 Date Range:');
  console.log(`   From: ${report.summary.dateRange.from}`);
  console.log(`   To:   ${report.summary.dateRange.to}`);
  
  console.log('\n📈 Summary:');
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   Passed:      ${report.summary.passed} (${Math.round(report.summary.passed / report.summary.totalTests * 100)}%)`);
  console.log(`   Failed:      ${report.summary.failed} (${Math.round(report.summary.failed / report.summary.totalTests * 100)}%)`);
  console.log(`   Skipped:     ${report.summary.skipped}`);
  console.log(`   Avg Duration: ${report.summary.avgDuration}ms`);
  
  if (report.regressions.length > 0) {
    console.log('\n⚠️  PERFORMANCE REGRESSIONS (>50% slower):');
    for (const reg of report.regressions) {
      console.log(`   ❌ ${reg.testName}`);
      console.log(`      Current: ${reg.currentDuration}ms | Baseline: ${reg.baselineDuration}ms | ${reg.percentageSlower}% slower`);
    }
  }
  
  if (report.slowLocators.length > 0) {
    console.log('\n🐌 SLOW LOCATORS (>500ms):');
    for (const loc of report.slowLocators.slice(0, 10)) {
      console.log(`   ⚠️  ${loc.locatorKey}`);
      console.log(`      Avg: ${loc.avgLookupTimeMs}ms | Max: ${loc.maxLookupTimeMs}ms | Occurrences: ${loc.occurrences}`);
    }
    if (report.slowLocators.length > 10) {
      console.log(`   ... and ${report.slowLocators.length - 10} more`);
    }
  }
  
  if (report.performanceComparison.length > 0) {
    console.log('\n📊 Performance Comparison (Top 10):');
    const topComparisons = report.performanceComparison
      .sort((a, b) => b.percentageDifference - a.percentageDifference)
      .slice(0, 10);
    
    for (const comp of topComparisons) {
      const icon = comp.status === 'improved' ? '✅' : comp.status === 'regressed' ? '❌' : '➖';
      console.log(`   ${icon} ${comp.testName}`);
      console.log(`      Current: ${comp.currentDuration}ms | Baseline: ${comp.baselineDuration}ms | ${comp.percentageDifference}% ${comp.status}`);
    }
  }
  
  if (report.waitInefficiencies.length > 0) {
    console.log('\n⏱️  Wait Inefficiencies:');
    for (const wait of report.waitInefficiencies.slice(0, 5)) {
      console.log(`   ${wait.condition}`);
      console.log(`      Configured: ${wait.avgConfiguredMs}ms | Actual: ${wait.avgActualMs}ms | Wasted: ${wait.avgWastedMs}ms | Efficiency: ${wait.efficiency}%`);
    }
  }
  
  if (report.parallelEfficiency) {
    console.log('\n⚡ Parallel Execution Efficiency:');
    console.log(`   Workers: ${report.parallelEfficiency.workers}`);
    console.log(`   Total Tests: ${report.parallelEfficiency.totalTests}`);
    console.log(`   Total Duration: ${Math.round(report.parallelEfficiency.totalDurationMs / 1000)}s`);
    console.log(`   Efficiency: ${report.parallelEfficiency.efficiency}%`);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}
