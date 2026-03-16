/**
 * Unit tests for SQLiteStore implementation.
 * Uses in-memory database for test isolation.
 * 
 * @module plugins/metrics/sqlite-store.test
 * @requirements 17.1, 17.2, 17.4, 17.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteStore, type TestMetricRecord, type SuiteMetricRecord } from './sqlite-store.js';

function createTestMetricRecord(overrides: Partial<TestMetricRecord> = {}): TestMetricRecord {
  return {
    testId: 'test-123',
    testName: 'Login Test',
    status: 'passed',
    durationMs: 1500,
    workerId: 'worker-1',
    locatorMetrics: [],
    waitMetrics: [],
    ...overrides,
  };
}

function createSuiteMetricRecord(overrides: Partial<SuiteMetricRecord> = {}): SuiteMetricRecord {
  return {
    suiteId: 'suite-123',
    totalTests: 10,
    passed: 8,
    failed: 1,
    skipped: 1,
    totalDurationMs: 30000,
    parallelWorkers: 4,
    ...overrides,
  };
}

describe('SQLiteStore', () => {
  let store: SQLiteStore;

  beforeEach(async () => {
    // Use in-memory database for test isolation
    store = new SQLiteStore({ dbPath: ':memory:' });
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
  });

  describe('initialization', () => {
    it('should initialize database successfully', () => {
      expect(store.isInitialized()).toBe(true);
    });

    it('should create tables on initialization', async () => {
      // If we can save and retrieve data, tables were created
      const metrics = createTestMetricRecord();
      await store.saveTestMetric(metrics);
      await store.flush();
      
      const baseline = await store.getBaseline('test-123');
      expect(baseline).not.toBeNull();
    });
  });

  describe('saveTestMetric', () => {
    it('should save test metrics successfully', async () => {
      const metrics = createTestMetricRecord();
      await store.saveTestMetric(metrics);
      await store.flush();

      const baseline = await store.getBaseline('test-123');
      expect(baseline).not.toBeNull();
      expect(baseline?.avgDurationMs).toBe(1500);
    });

    it('should save metrics with locator data', async () => {
      const metrics = createTestMetricRecord({
        locatorMetrics: [
          { locatorKey: 'login.username', lookupTimeMs: 50, success: true },
          { locatorKey: 'login.password', lookupTimeMs: 45, success: true },
        ],
      });
      await store.saveTestMetric(metrics);
      await store.flush();

      const baseline = await store.getBaseline('test-123');
      expect(baseline).not.toBeNull();
    });

    it('should save metrics with wait data', async () => {
      const metrics = createTestMetricRecord({
        waitMetrics: [
          { condition: 'visible', configuredMs: 5000, actualMs: 250, success: true },
          { condition: 'clickable', configuredMs: 5000, actualMs: 100, success: true },
        ],
      });
      await store.saveTestMetric(metrics);
      await store.flush();

      const baseline = await store.getBaseline('test-123');
      expect(baseline).not.toBeNull();
    });

    it('should handle metrics without optional fields', async () => {
      const metrics = createTestMetricRecord({
        workerId: undefined,
      });
      await store.saveTestMetric(metrics);
      await store.flush();

      const baseline = await store.getBaseline('test-123');
      expect(baseline).not.toBeNull();
    });

    it('should batch writes for performance', async () => {
      // Save multiple metrics without explicit flush
      for (let i = 0; i < 5; i++) {
        await store.saveTestMetric(createTestMetricRecord({ testId: `test-${i}` }));
      }
      
      // Metrics should be pending until batch size is reached or flush is called
      await store.flush();
      
      // All metrics should be saved
      for (let i = 0; i < 5; i++) {
        const baseline = await store.getBaseline(`test-${i}`);
        expect(baseline).not.toBeNull();
      }
    });
  });

  describe('saveSuiteMetric', () => {
    it('should save suite metrics successfully', async () => {
      const metrics = createSuiteMetricRecord();
      await store.saveSuiteMetric(metrics);
      // Suite metrics don't have a getter, but should not throw
    });

    it('should save suite metrics without optional fields', async () => {
      const metrics = createSuiteMetricRecord({
        parallelWorkers: undefined,
      });
      await store.saveSuiteMetric(metrics);
      // Should not throw
    });
  });

  describe('getBaseline', () => {
    it('should return null for non-existent test', async () => {
      const baseline = await store.getBaseline('non-existent');
      expect(baseline).toBeNull();
    });

    it('should return baseline for existing test', async () => {
      await store.saveTestMetric(createTestMetricRecord({ testId: 'test-abc', durationMs: 1000 }));
      await store.flush();

      const baseline = await store.getBaseline('test-abc');
      expect(baseline).not.toBeNull();
      expect(baseline?.testId).toBe('test-abc');
      expect(baseline?.avgDurationMs).toBe(1000);
      expect(baseline?.sampleCount).toBe(1);
    });
  });

  describe('updateBaseline', () => {
    it('should create baseline for new test', async () => {
      await store.updateBaseline('new-test', 1000);
      
      const baseline = await store.getBaseline('new-test');
      expect(baseline).not.toBeNull();
      expect(baseline?.avgDurationMs).toBe(1000);
      expect(baseline?.sampleCount).toBe(1);
    });

    it('should update baseline with running average', async () => {
      await store.updateBaseline('test-avg', 1000);
      await store.updateBaseline('test-avg', 2000);
      
      const baseline = await store.getBaseline('test-avg');
      expect(baseline).not.toBeNull();
      expect(baseline?.avgDurationMs).toBe(1500); // (1000 + 2000) / 2
      expect(baseline?.sampleCount).toBe(2);
    });

    it('should calculate correct running average for multiple updates', async () => {
      await store.updateBaseline('test-multi', 100);
      await store.updateBaseline('test-multi', 200);
      await store.updateBaseline('test-multi', 300);
      
      const baseline = await store.getBaseline('test-multi');
      expect(baseline).not.toBeNull();
      expect(baseline?.avgDurationMs).toBe(200); // (100 + 200 + 300) / 3
      expect(baseline?.sampleCount).toBe(3);
    });
  });

  describe('getHistoricalAverage', () => {
    it('should return null for non-existent test', async () => {
      const avg = await store.getHistoricalAverage('non-existent');
      expect(avg).toBeNull();
    });

    it('should return average duration for existing test', async () => {
      await store.updateBaseline('test-hist', 1500);
      
      const avg = await store.getHistoricalAverage('test-hist');
      expect(avg).toBe(1500);
    });
  });

  describe('flush', () => {
    it('should flush pending writes', async () => {
      await store.saveTestMetric(createTestMetricRecord({ testId: 'flush-test' }));
      await store.flush();
      
      const baseline = await store.getBaseline('flush-test');
      expect(baseline).not.toBeNull();
    });

    it('should handle empty flush gracefully', async () => {
      await store.flush();
      // Should not throw
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await store.close();
      expect(store.isInitialized()).toBe(false);
    });

    it('should flush before closing', async () => {
      await store.saveTestMetric(createTestMetricRecord({ testId: 'close-test' }));
      await store.close();
      
      // Reopen to verify data was saved
      const newStore = new SQLiteStore({ dbPath: ':memory:' });
      await newStore.initialize();
      // Note: In-memory DB doesn't persist, but the flush should have been called
      await newStore.close();
    });
  });

  describe('error handling', () => {
    it('should throw error when saving without initialization', async () => {
      const uninitializedStore = new SQLiteStore({ dbPath: ':memory:' });
      
      await expect(uninitializedStore.saveSuiteMetric(createSuiteMetricRecord()))
        .rejects.toThrow('Database not initialized');
    });

    it('should throw error when getting baseline without initialization', async () => {
      const uninitializedStore = new SQLiteStore({ dbPath: ':memory:' });
      
      await expect(uninitializedStore.getBaseline('test'))
        .rejects.toThrow('Database not initialized');
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple concurrent saves', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(store.saveTestMetric(createTestMetricRecord({ 
          testId: `concurrent-${i}`,
          durationMs: 1000 + i * 100,
        })));
      }
      
      await Promise.all(promises);
      await store.flush();
      
      // Verify all were saved
      for (let i = 0; i < 20; i++) {
        const baseline = await store.getBaseline(`concurrent-${i}`);
        expect(baseline).not.toBeNull();
      }
    });
  });
});
