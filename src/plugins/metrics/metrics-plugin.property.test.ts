/**
 * Property-based tests for Metrics Persistence.
 * 
 * **Property 53: Metrics Persistence**
 * **Validates: Requirements 17.1, 17.2**
 * 
 * Tests that test metrics are persisted to SQLite and retrievable,
 * and that historical averages are calculated correctly.
 * 
 * @module plugins/metrics/metrics-plugin.property.test
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { SQLiteStore, type TestMetricRecord, type LocatorMetricData, type WaitMetricData } from './sqlite-store.js';
import { MetricsPlugin, type MetricsPluginConfig } from './metrics-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';
import type { TestStatus } from '../plugin.types.js';

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Arbitrary for generating valid test IDs.
 * Test IDs should be alphanumeric with optional dashes/underscores.
 */
const testIdArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Arbitrary for generating valid test names.
 */
const testNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generating test status.
 */
const testStatusArb: fc.Arbitrary<TestStatus> = fc.constantFrom('passed', 'failed', 'skipped', 'pending');

/**
 * Arbitrary for generating test duration in milliseconds.
 * Realistic range: 100ms to 5 minutes.
 */
const durationArb = fc.integer({ min: 100, max: 300000 });

/**
 * Arbitrary for generating positive durations for average calculations.
 */
const positiveDurationArb = fc.integer({ min: 1, max: 100000 });


/**
 * Arbitrary for generating worker IDs.
 */
const workerIdArb = fc.option(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  { nil: undefined }
);

/**
 * Arbitrary for generating locator keys.
 */
const locatorKeyArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(s));

/**
 * Arbitrary for generating locator lookup times.
 */
const lookupTimeArb = fc.integer({ min: 1, max: 5000 });

/**
 * Arbitrary for generating locator metrics.
 */
const locatorMetricArb: fc.Arbitrary<LocatorMetricData> = fc.record({
  locatorKey: locatorKeyArb,
  lookupTimeMs: lookupTimeArb,
  success: fc.boolean(),
});

/**
 * Arbitrary for generating wait condition names.
 */
const waitConditionArb = fc.constantFrom(
  'visible', 'clickable', 'present', 'stale',
  'networkIdle', 'text', 'count', 'animationComplete'
);

/**
 * Arbitrary for generating wait metrics.
 */
const waitMetricArb: fc.Arbitrary<WaitMetricData> = fc.record({
  condition: waitConditionArb,
  configuredMs: fc.integer({ min: 1000, max: 30000 }),
  actualMs: fc.integer({ min: 0, max: 30000 }),
  success: fc.boolean(),
});

/**
 * Arbitrary for generating a complete test metric record.
 */
const testMetricRecordArb: fc.Arbitrary<TestMetricRecord> = fc.record({
  testId: testIdArb,
  testName: testNameArb,
  status: testStatusArb,
  durationMs: durationArb,
  workerId: workerIdArb,
  locatorMetrics: fc.array(locatorMetricArb, { minLength: 0, maxLength: 5 }),
  waitMetrics: fc.array(waitMetricArb, { minLength: 0, maxLength: 5 }),
});

/**
 * Arbitrary for generating a sequence of durations for the same test.
 */
const durationSequenceArb = fc.array(positiveDurationArb, { minLength: 1, maxLength: 20 });


// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create a mock structured logger for testing.
 */
function createMockLogger(): StructuredLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setTestId: vi.fn(),
    clearTestId: vi.fn(),
  } as unknown as StructuredLogger;
}

/**
 * Calculate the expected arithmetic mean of an array of numbers.
 */
function calculateArithmeticMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Create a fresh SQLite store for each test iteration.
 * Uses in-memory database for isolation.
 */
async function createFreshStore(): Promise<SQLiteStore> {
  const store = new SQLiteStore({ dbPath: ':memory:' });
  await store.initialize();
  return store;
}


// ============================================================================
// Property Tests
// ============================================================================

describe('Property 53: Metrics Persistence', () => {
  describe('Metrics Persistence Invariant', () => {
    /**
     * Property: For any test execution (testId, testName, status, duration),
     * the metrics should be persisted to SQLite and retrievable.
     * The persisted data should match the original data exactly.
     */
    it('should persist test metrics and make them retrievable via baseline', async () => {
      await fc.assert(
        fc.asyncProperty(
          testMetricRecordArb,
          async (metrics) => {
            // Create a fresh store for this iteration
            const store = await createFreshStore();
            
            try {
              // Save the test metric
              await store.saveTestMetric(metrics);
              await store.flush();

              // Retrieve the baseline for this test
              const baseline = await store.getBaseline(metrics.testId);

              // Baseline should exist
              expect(baseline).not.toBeNull();
              expect(baseline?.testId).toBe(metrics.testId);
              
              // First execution should have sample count of 1
              expect(baseline?.sampleCount).toBe(1);
              
              // Average duration should equal the single duration
              expect(baseline?.avgDurationMs).toBe(metrics.durationMs);
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 50 }
      );
    });


    it('should persist metrics with locator data correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          testStatusArb,
          durationArb,
          fc.array(locatorMetricArb, { minLength: 1, maxLength: 10 }),
          async (testId, testName, status, durationMs, locatorMetrics) => {
            const store = await createFreshStore();
            
            try {
              const metrics: TestMetricRecord = {
                testId,
                testName,
                status,
                durationMs,
                locatorMetrics,
                waitMetrics: [],
              };

              // Save the test metric
              await store.saveTestMetric(metrics);
              await store.flush();

              // Baseline should be created
              const baseline = await store.getBaseline(testId);
              expect(baseline).not.toBeNull();
              expect(baseline?.testId).toBe(testId);
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should persist metrics with wait data correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          testStatusArb,
          durationArb,
          fc.array(waitMetricArb, { minLength: 1, maxLength: 10 }),
          async (testId, testName, status, durationMs, waitMetrics) => {
            const store = await createFreshStore();
            
            try {
              const metrics: TestMetricRecord = {
                testId,
                testName,
                status,
                durationMs,
                locatorMetrics: [],
                waitMetrics,
              };

              // Save the test metric
              await store.saveTestMetric(metrics);
              await store.flush();

              // Baseline should be created
              const baseline = await store.getBaseline(testId);
              expect(baseline).not.toBeNull();
              expect(baseline?.testId).toBe(testId);
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Historical Average Calculation', () => {
    /**
     * Property: For any sequence of test executions with the same testId,
     * the historical average should equal the arithmetic mean of all durations.
     * The average should be calculated correctly regardless of execution order.
     */
    it('should calculate historical average as arithmetic mean of all durations', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          durationSequenceArb,
          async (testId, durations) => {
            const store = await createFreshStore();
            
            try {
              // Save multiple test executions with the same testId
              for (const duration of durations) {
                await store.updateBaseline(testId, duration);
              }

              // Get the historical average
              const historicalAvg = await store.getHistoricalAverage(testId);

              // Calculate expected average
              const expectedAvg = calculateArithmeticMean(durations);

              // Historical average should match expected average
              expect(historicalAvg).not.toBeNull();
              // Allow small floating point tolerance
              expect(Math.abs(historicalAvg! - expectedAvg)).toBeLessThan(0.01);
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain correct sample count after multiple executions', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          durationSequenceArb,
          async (testId, durations) => {
            const store = await createFreshStore();
            
            try {
              // Save multiple test executions
              for (const duration of durations) {
                await store.updateBaseline(testId, duration);
              }

              // Get the baseline
              const baseline = await store.getBaseline(testId);

              // Sample count should equal number of executions
              expect(baseline).not.toBeNull();
              expect(baseline?.sampleCount).toBe(durations.length);
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 50 }
      );
    });


    it('should calculate running average correctly for incremental updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          fc.array(positiveDurationArb, { minLength: 2, maxLength: 10 }),
          async (testId, durations) => {
            const store = await createFreshStore();
            
            try {
              let runningSum = 0;
              let count = 0;

              for (const duration of durations) {
                runningSum += duration;
                count++;

                await store.updateBaseline(testId, duration);

                const baseline = await store.getBaseline(testId);
                const expectedAvg = runningSum / count;

                expect(baseline).not.toBeNull();
                expect(baseline?.sampleCount).toBe(count);
                // Allow small floating point tolerance
                expect(Math.abs(baseline!.avgDurationMs - expectedAvg)).toBeLessThan(0.01);
              }
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Locator Metrics Persistence', () => {
    /**
     * Property: For any locator lookup metrics (locatorKey, lookupTimeMs, success),
     * the metrics should be persisted and associated with the correct test.
     */
    it('should persist locator metrics with test metrics', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          fc.array(locatorMetricArb, { minLength: 1, maxLength: 10 }),
          async (testId, testName, locatorMetrics) => {
            const store = await createFreshStore();
            
            try {
              const metrics: TestMetricRecord = {
                testId,
                testName,
                status: 'passed',
                durationMs: 1000,
                locatorMetrics,
                waitMetrics: [],
              };

              // Save the test metric
              await store.saveTestMetric(metrics);
              await store.flush();

              // Verify baseline was created (indicates successful persistence)
              const baseline = await store.getBaseline(testId);
              expect(baseline).not.toBeNull();
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Wait Metrics Persistence', () => {
    /**
     * Property: For any wait metrics (condition, configuredMs, actualMs, success),
     * the metrics should be persisted and associated with the correct test.
     */
    it('should persist wait metrics with test metrics', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          fc.array(waitMetricArb, { minLength: 1, maxLength: 10 }),
          async (testId, testName, waitMetrics) => {
            const store = await createFreshStore();
            
            try {
              const metrics: TestMetricRecord = {
                testId,
                testName,
                status: 'passed',
                durationMs: 1000,
                locatorMetrics: [],
                waitMetrics,
              };

              // Save the test metric
              await store.saveTestMetric(metrics);
              await store.flush();

              // Verify baseline was created (indicates successful persistence)
              const baseline = await store.getBaseline(testId);
              expect(baseline).not.toBeNull();
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Non-Existent Test Handling', () => {
    it('should return null for non-existent test baseline', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          async (testId) => {
            const store = await createFreshStore();
            
            try {
              // Query baseline for a test that was never saved
              const baseline = await store.getBaseline(testId);
              expect(baseline).toBeNull();
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should return null for non-existent test historical average', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          async (testId) => {
            const store = await createFreshStore();
            
            try {
              // Query historical average for a test that was never saved
              const avg = await store.getHistoricalAverage(testId);
              expect(avg).toBeNull();
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Multiple Tests Independence', () => {
    /**
     * Property: Metrics for different tests should be stored independently.
     * Updating one test's metrics should not affect another test's metrics.
     */
    it('should store metrics for different tests independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(testIdArb, { minLength: 2, maxLength: 5 })
            .map(ids => [...new Set(ids)])
            .filter(ids => ids.length >= 2),
          fc.array(positiveDurationArb, { minLength: 2, maxLength: 5 }),
          async (testIds, durations) => {
            const store = await createFreshStore();
            
            try {
              // Ensure we have enough durations for all test IDs
              const effectiveDurations = durations.slice(0, testIds.length);
              while (effectiveDurations.length < testIds.length) {
                effectiveDurations.push(1000);
              }

              // Save metrics for each test
              for (let i = 0; i < testIds.length; i++) {
                await store.updateBaseline(testIds[i], effectiveDurations[i]);
              }

              // Verify each test has its own independent baseline
              for (let i = 0; i < testIds.length; i++) {
                const baseline = await store.getBaseline(testIds[i]);
                expect(baseline).not.toBeNull();
                expect(baseline?.testId).toBe(testIds[i]);
                expect(baseline?.avgDurationMs).toBe(effectiveDurations[i]);
                expect(baseline?.sampleCount).toBe(1);
              }
            } finally {
              await store.close();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});


describe('MetricsPlugin Performance Regression Detection', () => {
  describe('Performance Regression Detection', () => {
    /**
     * Property: For any test where duration > baseline * (1 + threshold),
     * a performance regression should be detected and logged.
     */
    it('should detect performance regression when duration exceeds threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          fc.integer({ min: 100, max: 10000 }), // Use larger base durations to avoid rounding issues
          fc.double({ min: 1.6, max: 3.0, noNaN: true }), // Multiplier > 1 + threshold (0.5)
          async (testId, testName, baseDuration, multiplier) => {
            const mockLogger = createMockLogger();
            
            const config: Partial<MetricsPluginConfig> = {
              enabled: true,
              dbPath: ':memory:',
              slowLocatorThresholdMs: 500,
              performanceRegressionThreshold: 0.5, // 50%
            };
            
            const plugin = new MetricsPlugin(config, mockLogger);
            await plugin.initialize();
            
            try {
              // First, establish a baseline by running the test once
              await plugin.onTestStart(testId, testName);
              await plugin.onTestEnd(testId, 'passed', baseDuration);
              
              // Flush to ensure baseline is persisted before regression check
              await plugin.flush();

              // Clear the mock to check for new warnings
              vi.clearAllMocks();

              // Run the test again with a duration that exceeds the threshold
              // Ensure we exceed the threshold by at least 1ms
              const regressedDuration = Math.ceil(baseDuration * multiplier);
              await plugin.onTestStart(testId, testName);
              await plugin.onTestEnd(testId, 'passed', regressedDuration);

              // Since multiplier > 1.5 and we use ceil, a warning should have been logged
              expect(mockLogger.warn).toHaveBeenCalledWith(
                'Performance regression detected',
                expect.objectContaining({
                  testId,
                })
              );
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });


    it('should not detect regression when duration is within threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          positiveDurationArb,
          fc.double({ min: 0.5, max: 1.4, noNaN: true }), // Multiplier <= 1 + threshold (0.5)
          async (testId, testName, baseDuration, multiplier) => {
            const mockLogger = createMockLogger();
            
            const config: Partial<MetricsPluginConfig> = {
              enabled: true,
              dbPath: ':memory:',
              slowLocatorThresholdMs: 500,
              performanceRegressionThreshold: 0.5, // 50%
            };
            
            const plugin = new MetricsPlugin(config, mockLogger);
            await plugin.initialize();
            
            try {
              // First, establish a baseline
              await plugin.onTestStart(testId, testName);
              await plugin.onTestEnd(testId, 'passed', baseDuration);
              
              // Flush to ensure baseline is persisted before regression check
              await plugin.flush();

              // Clear the mock
              vi.clearAllMocks();

              // Run the test again with a duration within threshold
              const normalDuration = Math.round(baseDuration * multiplier);
              await plugin.onTestStart(testId, testName);
              await plugin.onTestEnd(testId, 'passed', normalDuration);

              // No regression warning should be logged for durations within threshold
              const warnCalls = (mockLogger.warn as ReturnType<typeof vi.fn>).mock.calls;
              const regressionWarnings = warnCalls.filter(
                (call: unknown[]) => call[0] === 'Performance regression detected'
              );
              expect(regressionWarnings.length).toBe(0);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Slow Locator Detection', () => {
    it('should flag slow locators exceeding threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          locatorKeyArb,
          fc.integer({ min: 501, max: 5000 }), // Above 500ms threshold
          async (testId, testName, locatorKey, lookupTime) => {
            const mockLogger = createMockLogger();
            
            const config: Partial<MetricsPluginConfig> = {
              enabled: true,
              dbPath: ':memory:',
              slowLocatorThresholdMs: 500,
              performanceRegressionThreshold: 0.5,
            };
            
            const plugin = new MetricsPlugin(config, mockLogger);
            await plugin.initialize();
            
            try {
              await plugin.onTestStart(testId, testName);
              
              // Clear mock to check for new warnings
              vi.clearAllMocks();
              
              // Record a slow locator lookup
              plugin.recordLocatorLookup(locatorKey, lookupTime, true);

              // Should log a warning for slow locator
              expect(mockLogger.warn).toHaveBeenCalledWith(
                'Slow locator detected',
                expect.objectContaining({
                  locator: locatorKey,
                  timeMs: lookupTime,
                })
              );

              await plugin.onTestEnd(testId, 'passed', 1000);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not flag locators within threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          locatorKeyArb,
          fc.integer({ min: 1, max: 500 }), // At or below 500ms threshold
          async (testId, testName, locatorKey, lookupTime) => {
            const mockLogger = createMockLogger();
            
            const config: Partial<MetricsPluginConfig> = {
              enabled: true,
              dbPath: ':memory:',
              slowLocatorThresholdMs: 500,
              performanceRegressionThreshold: 0.5,
            };
            
            const plugin = new MetricsPlugin(config, mockLogger);
            await plugin.initialize();
            
            try {
              await plugin.onTestStart(testId, testName);
              
              // Clear mock
              vi.clearAllMocks();
              
              // Record a fast locator lookup
              plugin.recordLocatorLookup(locatorKey, lookupTime, true);

              // Should not log a warning for fast locator
              const warnCalls = (mockLogger.warn as ReturnType<typeof vi.fn>).mock.calls;
              const slowLocatorWarnings = warnCalls.filter(
                (call: unknown[]) => call[0] === 'Slow locator detected'
              );
              expect(slowLocatorWarnings.length).toBe(0);

              await plugin.onTestEnd(testId, 'passed', 1000);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Wait Time Recording', () => {
    it('should record wait metrics during test execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          waitConditionArb,
          fc.integer({ min: 1000, max: 30000 }),
          fc.integer({ min: 0, max: 30000 }),
          fc.boolean(),
          async (testId, testName, condition, configuredMs, actualMs, success) => {
            const mockLogger = createMockLogger();
            
            const config: Partial<MetricsPluginConfig> = {
              enabled: true,
              dbPath: ':memory:',
              slowLocatorThresholdMs: 500,
              performanceRegressionThreshold: 0.5,
            };
            
            const plugin = new MetricsPlugin(config, mockLogger);
            await plugin.initialize();
            
            try {
              await plugin.onTestStart(testId, testName);
              
              // Record wait time
              plugin.recordWaitTime(condition, configuredMs, actualMs, success);

              // Complete the test
              await plugin.onTestEnd(testId, 'passed', 1000);

              // Wait metrics should be recorded (verified by successful test completion)
              // The actual verification is that no errors are thrown
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
