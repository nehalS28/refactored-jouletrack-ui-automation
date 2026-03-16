/**
 * Unit tests for metrics:report CLI command
 * 
 * @module cli/commands/metrics-report.test
 * @requirements 17.1, 17.2, 17.4, 17.5, 17.6, 17.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateMetricsReport, type MetricsReportOptions } from './metrics-report.js';
import { SQLiteStore } from '../../src/plugins/metrics/sqlite-store.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock SQLiteStore
vi.mock('../../src/plugins/metrics/sqlite-store.js');

describe('metrics:report CLI command', () => {
  const testDbPath = '.cache/test-metrics.db';
  const testReportPath = '.cache/test-report';

  beforeEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testReportPath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testReportPath, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Task 16.1: Create metrics:report CLI command', () => {
    it('should query SQLite database for test metrics', async () => {
      // Arrange
      const mockStore = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined)
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      const options: MetricsReportOptions = {
        format: 'json',
        days: 7,
        dbPath: testDbPath
      };

      // Act
      await generateMetricsReport(options);

      // Assert
      expect(mockStore.initialize).toHaveBeenCalled();
      expect(mockStore.getTestMetrics).toHaveBeenCalledWith(7);
      expect(mockStore.close).toHaveBeenCalled();
    });

    it('should support multiple output formats (json, html, console)', async () => {
      // Arrange
      const mockStore = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined)
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act & Assert - JSON format
      await generateMetricsReport({ format: 'json', days: 7, dbPath: testDbPath });
      expect(mockStore.getTestMetrics).toHaveBeenCalled();

      // Act & Assert - HTML format
      await generateMetricsReport({ format: 'html', days: 7, dbPath: testDbPath });
      expect(mockStore.getTestMetrics).toHaveBeenCalled();

      // Act & Assert - Console format
      await generateMetricsReport({ format: 'console', days: 7, dbPath: testDbPath });
      expect(mockStore.getTestMetrics).toHaveBeenCalled();
    });

    it('should support date range filtering with --days option', async () => {
      // Arrange
      const mockStore = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined)
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act
      await generateMetricsReport({ format: 'json', days: 30, dbPath: testDbPath });

      // Assert
      expect(mockStore.getTestMetrics).toHaveBeenCalledWith(30);
    });
  });


  describe('Task 16.2: Generate performance comparison reports', () => {
    it('should compare current run vs baseline', async () => {
      // Arrange
      const mockTestMetrics = [
        {
          testId: 'test-1',
          testName: 'Login test',
          status: 'passed',
          durationMs: 3000,
          createdAt: new Date().toISOString()
        }
      ];

      const mockBaselines = [
        {
          testId: 'test-1',
          avgDurationMs: 2000,
          sampleCount: 10,
          updatedAt: new Date().toISOString()
        }
      ];

      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue(mockTestMetrics),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue(mockBaselines),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act
      const result = await generateMetricsReport({ 
        format: 'json', 
        days: 7, 
        dbPath: testDbPath,
        outputPath: path.join(testReportPath, 'report.json')
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.performanceComparison).toBeDefined();
      expect(result.performanceComparison.length).toBeGreaterThan(0);
      expect(result.performanceComparison[0].testId).toBe('test-1');
      expect(result.performanceComparison[0].currentDuration).toBe(3000);
      expect(result.performanceComparison[0].baselineDuration).toBe(2000);
    });

    it('should identify performance regressions (>50% slower)', async () => {
      // Arrange
      const mockTestMetrics = [
        {
          testId: 'test-slow',
          testName: 'Slow test',
          status: 'passed',
          durationMs: 4500, // 125% slower than baseline
          createdAt: new Date().toISOString()
        }
      ];

      const mockBaselines = [
        {
          testId: 'test-slow',
          avgDurationMs: 2000,
          sampleCount: 10,
          updatedAt: new Date().toISOString()
        }
      ];


      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue(mockTestMetrics),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue(mockBaselines),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act
      const result = await generateMetricsReport({ 
        format: 'json', 
        days: 7, 
        dbPath: testDbPath 
      });

      // Assert
      expect(result.regressions).toBeDefined();
      expect(result.regressions.length).toBe(1);
      expect(result.regressions[0].testId).toBe('test-slow');
      expect(result.regressions[0].percentageSlower).toBeGreaterThan(50);
    });

    it('should report slow locators (>500ms threshold)', async () => {
      // Arrange
      const mockTestMetrics = [
        {
          testId: 'test-1',
          testName: 'Test with slow locator',
          status: 'passed',
          durationMs: 2000,
          locatorMetrics: JSON.stringify([
            { locatorKey: 'slow-locator', lookupTimeMs: 750, success: true },
            { locatorKey: 'fast-locator', lookupTimeMs: 50, success: true }
          ]),
          createdAt: new Date().toISOString()
        }
      ];

      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue(mockTestMetrics),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act
      const result = await generateMetricsReport({ 
        format: 'json', 
        days: 7, 
        dbPath: testDbPath 
      });

      // Assert
      expect(result.slowLocators).toBeDefined();
      expect(result.slowLocators.length).toBe(1);
      expect(result.slowLocators[0].locatorKey).toBe('slow-locator');
      expect(result.slowLocators[0].avgLookupTimeMs).toBeGreaterThan(500);
    });


    it('should calculate parallel execution efficiency', async () => {
      // Arrange
      const mockSuiteMetrics = [
        {
          suiteId: 'suite-1',
          totalTests: 100,
          passed: 95,
          failed: 5,
          skipped: 0,
          totalDurationMs: 120000, // 2 minutes
          parallelWorkers: 4,
          createdAt: new Date().toISOString()
        }
      ];

      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue(mockSuiteMetrics),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act
      const result = await generateMetricsReport({ 
        format: 'json', 
        days: 7, 
        dbPath: testDbPath 
      });

      // Assert
      expect(result.parallelEfficiency).toBeDefined();
      expect(result.parallelEfficiency.workers).toBe(4);
      expect(result.parallelEfficiency.efficiency).toBeGreaterThan(0);
      expect(result.parallelEfficiency.efficiency).toBeLessThanOrEqual(100);
    });

    it('should report wait inefficiencies', async () => {
      // Arrange
      const mockTestMetrics = [
        {
          testId: 'test-1',
          testName: 'Test with inefficient waits',
          status: 'passed',
          durationMs: 5000,
          waitMetrics: JSON.stringify([
            { condition: 'visible', configuredMs: 10000, actualMs: 9500, success: true },
            { condition: 'clickable', configuredMs: 5000, actualMs: 100, success: true }
          ]),
          createdAt: new Date().toISOString()
        }
      ];

      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue(mockTestMetrics),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      // Act
      const result = await generateMetricsReport({ 
        format: 'json', 
        days: 7, 
        dbPath: testDbPath 
      });

      // Assert
      expect(result.waitInefficiencies).toBeDefined();
      expect(result.waitInefficiencies.length).toBeGreaterThan(0);
    });
  });


  describe('Task 16.3: Output format conversion', () => {
    it('should generate JSON format report', async () => {
      // Arrange
      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      const outputPath = path.join(testReportPath, 'report.json');

      // Act
      await generateMetricsReport({ 
        format: 'json', 
        days: 7, 
        dbPath: testDbPath,
        outputPath 
      });

      // Assert
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('performanceComparison');
      expect(parsed).toHaveProperty('regressions');
      expect(parsed).toHaveProperty('slowLocators');
    });

    it('should generate HTML format report', async () => {
      // Arrange
      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      const outputPath = path.join(testReportPath, 'report.html');

      // Act
      await generateMetricsReport({ 
        format: 'html', 
        days: 7, 
        dbPath: testDbPath,
        outputPath 
      });

      // Assert
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('Metrics Report');
    });

    it('should output to console format', async () => {
      // Arrange
      const mockStore = {
        initialize: vi.fn().mockResolvedValue(),
        getTestMetrics: vi.fn().mockResolvedValue([]),
        getSuiteMetrics: vi.fn().mockResolvedValue([]),
        getBaselines: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue()
      };
      vi.mocked(SQLiteStore).mockImplementation(() => mockStore as any);

      const consoleSpy = vi.spyOn(console, 'log');

      // Act
      await generateMetricsReport({ 
        format: 'console', 
        days: 7, 
        dbPath: testDbPath 
      });

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call => 
        call[0]?.includes('METRICS REPORT')
      )).toBe(true);
    });
  });
});
