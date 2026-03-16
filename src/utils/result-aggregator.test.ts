/**
 * Unit tests for ResultAggregator.
 * Tests aggregation of test results and metrics from parallel workers.
 * 
 * @module utils/result-aggregator.test
 * @requirements 15.4, 15.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAggregator } from './result-aggregator.js';
import type { WorkerResult, AggregatedResult } from './result-aggregator.js';

describe('ResultAggregator', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = new ResultAggregator();
  });

  describe('addWorkerResult', () => {
    it('should add a worker result', () => {
      const workerResult: WorkerResult = {
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 1,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      };

      aggregator.addWorkerResult(workerResult);
      const result = aggregator.getAggregatedResult();

      expect(result.totalWorkers).toBe(1);
      expect(result.testsPassed).toBe(5);
      expect(result.testsFailed).toBe(1);
    });

    it('should aggregate results from multiple workers', () => {
      const worker1: WorkerResult = {
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 1,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      };

      const worker2: WorkerResult = {
        workerId: 'worker-2',
        testsPassed: 3,
        testsFailed: 0,
        testsSkipped: 1,
        duration: 800,
        metrics: {
          totalLocatorLookups: 30,
          slowLocators: 1,
          totalWaitTime: 300,
        },
      };

      aggregator.addWorkerResult(worker1);
      aggregator.addWorkerResult(worker2);

      const result = aggregator.getAggregatedResult();

      expect(result.totalWorkers).toBe(2);
      expect(result.testsPassed).toBe(8);
      expect(result.testsFailed).toBe(1);
      expect(result.testsSkipped).toBe(1);
      expect(result.totalTests).toBe(10);
    });
  });

  describe('getAggregatedResult', () => {
    it('should return aggregated result with correct totals', () => {
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 10,
        testsFailed: 2,
        testsSkipped: 1,
        duration: 2000,
        metrics: {
          totalLocatorLookups: 100,
          slowLocators: 5,
          totalWaitTime: 1000,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-2',
        testsPassed: 8,
        testsFailed: 1,
        testsSkipped: 0,
        duration: 1500,
        metrics: {
          totalLocatorLookups: 80,
          slowLocators: 3,
          totalWaitTime: 800,
        },
      });

      const result = aggregator.getAggregatedResult();

      expect(result.totalTests).toBe(22);
      expect(result.testsPassed).toBe(18);
      expect(result.testsFailed).toBe(3);
      expect(result.testsSkipped).toBe(1);
      expect(result.totalWorkers).toBe(2);
    });

    it('should calculate total duration correctly', () => {
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 2000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-2',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 1500,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      });

      const result = aggregator.getAggregatedResult();

      // Total duration should be the max of all worker durations (parallel execution)
      expect(result.totalDuration).toBe(2000);
    });

    it('should aggregate metrics correctly', () => {
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      });

      aggregator.addWorkerResult({
        workerId: 'worker-2',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 30,
          slowLocators: 1,
          totalWaitTime: 300,
        },
      });

      const result = aggregator.getAggregatedResult();

      expect(result.aggregatedMetrics.totalLocatorLookups).toBe(80);
      expect(result.aggregatedMetrics.slowLocators).toBe(3);
      expect(result.aggregatedMetrics.totalWaitTime).toBe(800);
    });

    it('should return empty result when no workers added', () => {
      const result = aggregator.getAggregatedResult();

      expect(result.totalWorkers).toBe(0);
      expect(result.totalTests).toBe(0);
      expect(result.testsPassed).toBe(0);
      expect(result.testsFailed).toBe(0);
      expect(result.testsSkipped).toBe(0);
      expect(result.totalDuration).toBe(0);
    });
  });

  describe('recordWorkerFailure', () => {
    it('should record worker failure', () => {
      aggregator.recordWorkerFailure('worker-1', new Error('Worker crashed'));

      const result = aggregator.getAggregatedResult();

      expect(result.failedWorkers).toHaveLength(1);
      expect(result.failedWorkers[0].workerId).toBe('worker-1');
      expect(result.failedWorkers[0].error).toContain('Worker crashed');
    });

    it('should continue aggregating results after worker failure', () => {
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      });

      aggregator.recordWorkerFailure('worker-2', new Error('Worker crashed'));

      aggregator.addWorkerResult({
        workerId: 'worker-3',
        testsPassed: 3,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 800,
        metrics: {
          totalLocatorLookups: 30,
          slowLocators: 1,
          totalWaitTime: 300,
        },
      });

      const result = aggregator.getAggregatedResult();

      expect(result.totalWorkers).toBe(2); // Only successful workers
      expect(result.testsPassed).toBe(8);
      expect(result.failedWorkers).toHaveLength(1);
    });

    it('should record multiple worker failures', () => {
      aggregator.recordWorkerFailure('worker-1', new Error('Error 1'));
      aggregator.recordWorkerFailure('worker-2', new Error('Error 2'));

      const result = aggregator.getAggregatedResult();

      expect(result.failedWorkers).toHaveLength(2);
    });
  });

  describe('getWorkerResults', () => {
    it('should return all worker results', () => {
      const worker1: WorkerResult = {
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      };

      const worker2: WorkerResult = {
        workerId: 'worker-2',
        testsPassed: 3,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 800,
        metrics: {
          totalLocatorLookups: 30,
          slowLocators: 1,
          totalWaitTime: 300,
        },
      };

      aggregator.addWorkerResult(worker1);
      aggregator.addWorkerResult(worker2);

      const results = aggregator.getWorkerResults();

      expect(results).toHaveLength(2);
      expect(results[0].workerId).toBe('worker-1');
      expect(results[1].workerId).toBe('worker-2');
    });
  });

  describe('reset', () => {
    it('should reset all aggregated data', () => {
      aggregator.addWorkerResult({
        workerId: 'worker-1',
        testsPassed: 5,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 1000,
        metrics: {
          totalLocatorLookups: 50,
          slowLocators: 2,
          totalWaitTime: 500,
        },
      });

      aggregator.recordWorkerFailure('worker-2', new Error('Failed'));

      aggregator.reset();

      const result = aggregator.getAggregatedResult();

      expect(result.totalWorkers).toBe(0);
      expect(result.totalTests).toBe(0);
      expect(result.failedWorkers).toHaveLength(0);
    });
  });
});
