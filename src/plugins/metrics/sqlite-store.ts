/**
 * SQLite database wrapper for metrics persistence.
 * Provides storage for test metrics, suite metrics, and baselines.
 * 
 * @module plugins/metrics/sqlite-store
 * @requirements 17.1, 17.2, 17.4, 17.5
 */

import Database from 'better-sqlite3';
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
export class SQLiteStore {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private pendingWrites: TestMetricRecord[] = [];
  private readonly batchSize = 10;

  constructor(config: SQLiteStoreConfig) {
    this.dbPath = config.dbPath;
  }

  /**
   * Initialize the database and create tables.
   */
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.createTables();
  }

  /**
   * Create database tables if they don't exist.
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        worker_id TEXT,
        locator_metrics TEXT,
        wait_metrics TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS suite_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        suite_id TEXT NOT NULL,
        total_tests INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        failed INTEGER NOT NULL,
        skipped INTEGER NOT NULL,
        total_duration_ms INTEGER NOT NULL,
        parallel_workers INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS baselines (
        test_id TEXT PRIMARY KEY,
        avg_duration_ms REAL NOT NULL,
        sample_count INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_test_metrics_test_id ON test_metrics(test_id);
      CREATE INDEX IF NOT EXISTS idx_test_metrics_created_at ON test_metrics(created_at);
      CREATE INDEX IF NOT EXISTS idx_suite_metrics_suite_id ON suite_metrics(suite_id);
    `);
  }

  /**
   * Save test metrics to the database.
   * Uses batching for performance optimization.
   * 
   * @param metrics - Test metrics to save
   */
  async saveTestMetric(metrics: TestMetricRecord): Promise<void> {
    this.pendingWrites.push(metrics);

    if (this.pendingWrites.length >= this.batchSize) {
      await this.flushTestMetrics();
    }
  }

  /**
   * Flush pending test metrics to the database.
   */
  private async flushTestMetrics(): Promise<void> {
    if (!this.db || this.pendingWrites.length === 0) {
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO test_metrics (test_id, test_name, status, duration_ms, worker_id, locator_metrics, wait_metrics, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((records: TestMetricRecord[]) => {
      for (const record of records) {
        stmt.run(
          record.testId,
          record.testName,
          record.status,
          record.durationMs,
          record.workerId ?? null,
          JSON.stringify(record.locatorMetrics),
          JSON.stringify(record.waitMetrics),
          new Date().toISOString()
        );
        // Update baseline for each record
        this.updateBaselineSync(record.testId, record.durationMs);
      }
    });

    insertMany(this.pendingWrites);
    this.pendingWrites = [];
  }

  /**
   * Save suite metrics to the database.
   * 
   * @param metrics - Suite metrics to save
   */
  async saveSuiteMetric(metrics: SuiteMetricRecord): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT INTO suite_metrics (suite_id, total_tests, passed, failed, skipped, total_duration_ms, parallel_workers, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      metrics.suiteId,
      metrics.totalTests,
      metrics.passed,
      metrics.failed,
      metrics.skipped,
      metrics.totalDurationMs,
      metrics.parallelWorkers ?? null,
      new Date().toISOString()
    );
  }

  /**
   * Get baseline for a test.
   * 
   * @param testId - Test identifier
   * @returns Baseline record or null if not found
   */
  async getBaseline(testId: string): Promise<BaselineRecord | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare(`
      SELECT test_id, avg_duration_ms, sample_count, updated_at
      FROM baselines
      WHERE test_id = ?
    `).get(testId) as { test_id: string; avg_duration_ms: number; sample_count: number; updated_at: string } | undefined;

    if (!row) {
      return null;
    }

    return {
      testId: row.test_id,
      avgDurationMs: row.avg_duration_ms,
      sampleCount: row.sample_count,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update baseline for a test (synchronous version for transaction use).
   * 
   * @param testId - Test identifier
   * @param durationMs - Test duration in milliseconds
   */
  private updateBaselineSync(testId: string, durationMs: number): void {
    if (!this.db) {
      return;
    }

    const existing = this.db.prepare(`
      SELECT avg_duration_ms, sample_count FROM baselines WHERE test_id = ?
    `).get(testId) as { avg_duration_ms: number; sample_count: number } | undefined;

    if (existing) {
      const newCount = existing.sample_count + 1;
      const newAverage = (existing.avg_duration_ms * existing.sample_count + durationMs) / newCount;

      this.db.prepare(`
        UPDATE baselines 
        SET avg_duration_ms = ?, sample_count = ?, updated_at = ?
        WHERE test_id = ?
      `).run(newAverage, newCount, new Date().toISOString(), testId);
    } else {
      this.db.prepare(`
        INSERT INTO baselines (test_id, avg_duration_ms, sample_count, updated_at)
        VALUES (?, ?, 1, ?)
      `).run(testId, durationMs, new Date().toISOString());
    }
  }

  /**
   * Update baseline for a test.
   * 
   * @param testId - Test identifier
   * @param durationMs - Test duration in milliseconds
   */
  async updateBaseline(testId: string, durationMs: number): Promise<void> {
    this.updateBaselineSync(testId, durationMs);
  }

  /**
   * Get historical average duration for a test.
   * 
   * @param testId - Test identifier
   * @returns Average duration in milliseconds or null if no baseline exists
   */
  async getHistoricalAverage(testId: string): Promise<number | null> {
    const baseline = await this.getBaseline(testId);
    return baseline?.avgDurationMs ?? null;
  }

  /**
   * Flush all pending writes to the database.
   */
  async flush(): Promise<void> {
    await this.flushTestMetrics();
    
    if (this.db) {
      // Checkpoint WAL for durability
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    }
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    await this.flush();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if the database is initialized.
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Get test metrics for the last N days
   * 
   * @param days - Number of days to query
   * @returns Array of test metrics
   */
  async getTestMetrics(days: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const rows = this.db.prepare(`
      SELECT 
        test_id as testId,
        test_name as testName,
        status,
        duration_ms as durationMs,
        worker_id as workerId,
        locator_metrics as locatorMetrics,
        wait_metrics as waitMetrics,
        created_at as createdAt
      FROM test_metrics
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `).all(cutoffDate.toISOString());

    return rows as any[];
  }

  /**
   * Get suite metrics for the last N days
   * 
   * @param days - Number of days to query
   * @returns Array of suite metrics
   */
  async getSuiteMetrics(days: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const rows = this.db.prepare(`
      SELECT 
        suite_id as suiteId,
        total_tests as totalTests,
        passed,
        failed,
        skipped,
        total_duration_ms as totalDurationMs,
        parallel_workers as parallelWorkers,
        created_at as createdAt
      FROM suite_metrics
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `).all(cutoffDate.toISOString());

    return rows as any[];
  }

  /**
   * Get all baselines
   * 
   * @returns Array of baseline records
   */
  async getBaselines(): Promise<BaselineRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT 
        test_id as testId,
        avg_duration_ms as avgDurationMs,
        sample_count as sampleCount,
        updated_at as updatedAt
      FROM baselines
      ORDER BY test_id
    `).all();

    return rows as BaselineRecord[];
  }
}
