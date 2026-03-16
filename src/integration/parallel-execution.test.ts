/**
 * Integration tests for parallel test execution.
 * Tests that parallel workers have isolated contexts and results are aggregated correctly.
 * 
 * @module integration/parallel-execution.test
 * @requirements 15.2, 15.4, 15.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestContextFactory } from '../core/test-context.js';
import { ResultAggregator } from '../utils/result-aggregator.js';
import type { FrameworkConfig } from '../types/config.types.js';

describe('Parallel Execution Integration', () => {
  let config: FrameworkConfig;
  let factory: TestContextFactory;

  beforeEach(() => {
    // Create a minimal config for testing
    config = {
      environment: 'local',
      baseUrl: 'http://localhost:3000',
      browser: {
        name: 'chrome',
        headless: true,
        windowSize: { width: 1920, height: 1080 },
        args: ['--no-sandbox'],
      },
      timeouts: {
        implicit: 0,
        explicit: 10000,
        pageLoad: 30000,
        script: 10000,
        polling: 200,
      },
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
      },
      parallel: {
        enabled: true,
        workers: 4,
      },
      logging: {
        level: 'info',
        structured: true,
      },
      plugins: {
        enabled: [],
      },
    };

    factory = new TestContextFactory(config, { usePlaceholderDriver: true });
  });

  afterEach(async () => {
    // Cleanup is handled by dispose
  });

  describe('Worker Context Isolation', () => {
    it('should create isolated contexts for parallel workers', async () => {
      // Create contexts for 3 workers
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');
      const context3 = await factory.create('worker-3');

      try {
        // Each context should have unique IDs
        expect(context1.id).not.toBe(context2.id);
        expect(context1.id).not.toBe(context3.id);
        expect(context2.id).not.toBe(context3.id);

        // Each context should have unique worker IDs
        expect(context1.workerId).toBe('worker-1');
        expect(context2.workerId).toBe('worker-2');
        expect(context3.workerId).toBe('worker-3');

        // Each context should have unique correlation IDs
        expect(context1.correlationId).not.toBe(context2.correlationId);
        expect(context1.correlationId).not.toBe(context3.correlationId);
        expect(context2.correlationId).not.toBe(context3.correlationId);

        // Each context should have its own driver instance
        expect(context1.driver).not.toBe(context2.driver);
        expect(context1.driver).not.toBe(context3.driver);
        expect(context2.driver).not.toBe(context3.driver);

        // Each context should have its own logger instance
        expect(context1.logger).not.toBe(context2.logger);
        expect(context1.logger).not.toBe(context3.logger);
        expect(context2.logger).not.toBe(context3.logger);
      } finally {
        // Cleanup
        await factory.dispose(context1);
        await factory.dispose(context2);
        await factory.dispose(context3);
      }
    });

    it('should ensure no shared mutable state between workers', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      try {
        // Verify contexts are frozen (immutable)
        expect(Object.isFrozen(context1)).toBe(true);
        expect(Object.isFrozen(context2)).toBe(true);

        // Verify config is frozen
        expect(Object.isFrozen(context1.config)).toBe(true);
        expect(Object.isFrozen(context2.config)).toBe(true);

        // Attempt to modify context should fail silently or throw in strict mode
        const attemptModify = () => {
          // @ts-expect-error - Testing immutability
          context1.workerId = 'modified';
        };

        // In strict mode, this would throw. In non-strict, it fails silently.
        // Either way, the value should not change.
        try {
          attemptModify();
        } catch {
          // Expected in strict mode
        }

        expect(context1.workerId).toBe('worker-1');
      } finally {
        await factory.dispose(context1);
        await factory.dispose(context2);
      }
    });

    it('should create contexts with same config but independent instances', async () => {
      const context1 = await factory.create('worker-1');
      const context2 = await factory.create('worker-2');

      try {
        // Config values should be the same
        expect(context1.config.environment).toBe(context2.config.environment);
        expect(context1.config.baseUrl).toBe(context2.config.baseUrl);
        expect(context1.config.parallel.workers).toBe(context2.config.parallel.workers);

        // But config objects should be frozen copies
        expect(Object.isFrozen(context1.config)).toBe(true);
        expect(Object.isFrozen(context2.config)).toBe(true);
      } finally {
        await factory.dispose(context1);
        await factory.dispose(context2);
      }
    });
  });

  describe('Result Aggregation', () => {
    it('should aggregate results from multiple workers correctly', () => {
      const aggregator = new ResultAggregator();

      // Simulate results from 4 parallel workers
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 10,
        testsFailed: 1,
        testsSkipped: 0,
        duration: 5000,
        metrics: {
          totalLocatorLookups: 100,
          slowLocators: 2,
          totalWaitTime: 1000,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-2',
        testsPassed: 8,
        testsFailed: 0,
        testsSkipped: 1,
        duration: 4500,
        metrics: {
          totalLocatorLookups: 80,
          slowLocators: 1,
          totalWaitTime: 800,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-3',
        testsPassed: 12,
        testsFailed: 2,
        testsSkipped: 0,
        duration: 5500,
        metrics: {
          totalLocatorLookups: 120,
          slowLocators: 3,
          totalWaitTime: 1200,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-4',
        testsPassed: 9,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 4000,
        metrics: {
          totalLocatorLookups: 90,
          slowLocators: 1,
          totalWaitTime: 900,
        },
      });

      const result = aggregator.getAggregatedResult();

      // Verify aggregation
      expect(result.totalWorkers).toBe(4);
      expect(result.totalTests).toBe(43); // 10+8+12+9 + 1+0+2+0 + 0+1+0+0
      expect(result.testsPassed).toBe(39); // 10+8+12+9
      expect(result.testsFailed).toBe(3); // 1+0+2+0
      expect(result.testsSkipped).toBe(1); // 0+1+0+0

      // Duration should be max (parallel execution)
      expect(result.totalDuration).toBe(5500);

      // Metrics should be summed
      expect(result.aggregatedMetrics.totalLocatorLookups).toBe(390);
      expect(result.aggregatedMetrics.slowLocators).toBe(7);
      expect(result.aggregatedMetrics.totalWaitTime).toBe(3900);
    });

    it('should handle worker failures gracefully', () => {
      const aggregator = new ResultAggregator();

      // Worker 1 succeeds
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 10,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 5000,
        metrics: {
          totalLocatorLookups: 100,
          slowLocators: 2,
          totalWaitTime: 1000,
        },
      });

      // Worker 2 fails
      aggregator.recordWorkerFailure('worker-2', new Error('Worker crashed'));

      // Worker 3 succeeds
      aggregator.addWorkerResult({
        workerId: 'worker-3',
        testsPassed: 8,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 4500,
        metrics: {
          totalLocatorLookups: 80,
          slowLocators: 1,
          totalWaitTime: 800,
        },
      });

      // Worker 4 fails
      aggregator.recordWorkerFailure('worker-4', new Error('Out of memory'));

      const result = aggregator.getAggregatedResult();

      // Only successful workers should be counted
      expect(result.totalWorkers).toBe(2);
      expect(result.testsPassed).toBe(18);

      // Failed workers should be recorded
      expect(result.failedWorkers).toHaveLength(2);
      expect(result.failedWorkers[0].workerId).toBe('worker-2');
      expect(result.failedWorkers[0].error).toContain('Worker crashed');
      expect(result.failedWorkers[1].workerId).toBe('worker-4');
      expect(result.failedWorkers[1].error).toContain('Out of memory');
    });

    it('should continue execution when one worker fails', () => {
      const aggregator = new ResultAggregator();

      // Simulate parallel execution where worker 2 fails mid-execution
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 2000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 1,
          totalWaitTime: 500,
        },
      });

      // Worker 2 fails
      aggregator.recordWorkerFailure('worker-2', new Error('Browser crashed'));

      // Workers 3 and 4 continue and complete successfully
      aggregator.addWorkerResult({
        workerId: 'worker-3',
        testsPassed: 6,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 2500,
        metrics: {
          totalLocatorLookups: 60,
          slowLocators: 1,
          totalWaitTime: 600,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-4',
        testsPassed: 7,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 2200,
        metrics: {
          totalLocatorLookups: 70,
          slowLocators: 2,
          totalWaitTime: 700,
        },
      });

      const result = aggregator.getAggregatedResult();

      // Verify execution continued
      expect(result.totalWorkers).toBe(3);
      expect(result.testsPassed).toBe(18);
      expect(result.failedWorkers).toHaveLength(1);

      // Verify we got results from all successful workers
      const workerIds = result.workerResults.map(r => r.workerId);
      expect(workerIds).toContain('worker-1');
      expect(workerIds).toContain('worker-3');
      expect(workerIds).toContain('worker-4');
      expect(workerIds).not.toContain('worker-2');
    });
  });

  describe('Parallel Execution Simulation', () => {
    it('should simulate parallel test execution with isolated contexts', async () => {
      const aggregator = new ResultAggregator();
      const workerCount = 3;
      const contexts: Array<Awaited<ReturnType<typeof factory.create>>> = [];

      try {
        // Create contexts for all workers
        for (let i = 1; i <= workerCount; i++) {
          const context = await factory.create(`worker-${i}`);
          contexts.push(context);
        }

        // Verify all contexts are isolated
        const workerIds = contexts.map(c => c.workerId);
        const uniqueWorkerIds = new Set(workerIds);
        expect(uniqueWorkerIds.size).toBe(workerCount);

        const contextIds = contexts.map(c => c.id);
        const uniqueContextIds = new Set(contextIds);
        expect(uniqueContextIds.size).toBe(workerCount);

        // Simulate test execution on each worker
        for (let i = 0; i < workerCount; i++) {
          const context = contexts[i];
          
          // Simulate some test execution
          const testsPassed = 5 + i;
          const testsFailed = i % 2;
          const duration = 1000 + i * 500;

          aggregator.addWorkerResult({
            workerId: context.workerId,
            testsPassed,
            testsFailed,
            testsSkipped: 0,
            duration,
            metrics: {
              totalLocatorLookups: testsPassed * 10,
              slowLocators: testsFailed,
              totalWaitTime: duration / 2,
            },
          });
        }

        // Verify aggregated results
        const result = aggregator.getAggregatedResult();
        expect(result.totalWorkers).toBe(workerCount);
        expect(result.testsPassed).toBe(18); // 5+6+7
        expect(result.testsFailed).toBe(1); // 0+1+0
        expect(result.totalDuration).toBe(2000); // max(1000, 1500, 2000)
      } finally {
        // Cleanup all contexts
        for (const context of contexts) {
          await factory.dispose(context);
        }
      }
    });
  });
});
