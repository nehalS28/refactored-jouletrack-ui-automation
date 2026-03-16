/**
 * Unit tests for TestRunner.
 * Tests prioritization, sharding, and tag filtering functionality.
 * 
 * @module utils/test-runner.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestRunner, type TestFile, type ShardConfig, type PrioritizationConfig } from './test-runner.js';
import * as fs from 'fs/promises';

describe('TestRunner', () => {
  let runner: TestRunner;

  beforeEach(async () => {
    runner = new TestRunner('features', ':memory:');
    await runner.initialize();
  });

  afterEach(async () => {
    await runner.close();
  });

  describe('prioritizeTests', () => {
    it('should prioritize critical tests first', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: ['@regression'], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test2.feature', tags: ['@critical', '@smoke'], scenarios: 3, estimatedDurationMs: 5000 },
        { path: 'test3.feature', tags: ['@smoke'], scenarios: 2, estimatedDurationMs: 3000 },
      ];

      const config: PrioritizationConfig = {
        priorityTags: ['@critical', '@smoke'],
        runCriticalFirst: true,
      };

      const prioritized = runner.prioritizeTests(testFiles, config);

      // Critical + smoke should be first
      expect(prioritized[0].path).toBe('test2.feature');
      // Smoke only should be second
      expect(prioritized[1].path).toBe('test3.feature');
      // Regression should be last
      expect(prioritized[2].path).toBe('test1.feature');
    });

    it('should sort by duration when priority is equal', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: ['@smoke'], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test2.feature', tags: ['@smoke'], scenarios: 2, estimatedDurationMs: 3000 },
        { path: 'test3.feature', tags: ['@smoke'], scenarios: 3, estimatedDurationMs: 5000 },
      ];

      const config: PrioritizationConfig = {
        priorityTags: ['@smoke'],
        runCriticalFirst: true,
      };

      const prioritized = runner.prioritizeTests(testFiles, config);

      // Shorter tests first for faster feedback
      expect(prioritized[0].estimatedDurationMs).toBe(3000);
      expect(prioritized[1].estimatedDurationMs).toBe(5000);
      expect(prioritized[2].estimatedDurationMs).toBe(10000);
    });

    it('should not prioritize when runCriticalFirst is false', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: ['@regression'], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test2.feature', tags: ['@critical'], scenarios: 3, estimatedDurationMs: 5000 },
      ];

      const config: PrioritizationConfig = {
        priorityTags: ['@critical'],
        runCriticalFirst: false,
      };

      const prioritized = runner.prioritizeTests(testFiles, config);

      // Order should remain unchanged
      expect(prioritized[0].path).toBe('test1.feature');
      expect(prioritized[1].path).toBe('test2.feature');
    });
  });

  describe('shardTests', () => {
    it('should distribute tests evenly across shards', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: [], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test2.feature', tags: [], scenarios: 3, estimatedDurationMs: 8000 },
        { path: 'test3.feature', tags: [], scenarios: 2, estimatedDurationMs: 6000 },
        { path: 'test4.feature', tags: [], scenarios: 4, estimatedDurationMs: 4000 },
      ];

      const shard1 = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });
      const shard2 = runner.shardTests(testFiles, { shardIndex: 1, totalShards: 2 });

      // Each shard should have tests
      expect(shard1.length).toBeGreaterThan(0);
      expect(shard2.length).toBeGreaterThan(0);

      // Total tests should match
      expect(shard1.length + shard2.length).toBe(testFiles.length);

      // No test should appear in both shards
      const shard1Paths = shard1.map(t => t.path);
      const shard2Paths = shard2.map(t => t.path);
      const intersection = shard1Paths.filter(p => shard2Paths.includes(p));
      expect(intersection).toHaveLength(0);
    });

    it('should balance test distribution by duration', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: [], scenarios: 10, estimatedDurationMs: 20000 },
        { path: 'test2.feature', tags: [], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test3.feature', tags: [], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test4.feature', tags: [], scenarios: 2, estimatedDurationMs: 4000 },
      ];

      const shard1 = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });
      const shard2 = runner.shardTests(testFiles, { shardIndex: 1, totalShards: 2 });

      const shard1Duration = shard1.reduce((sum, t) => sum + t.estimatedDurationMs, 0);
      const shard2Duration = shard2.reduce((sum, t) => sum + t.estimatedDurationMs, 0);

      // Durations should be relatively balanced (within 50%)
      const ratio = Math.min(shard1Duration, shard2Duration) / Math.max(shard1Duration, shard2Duration);
      expect(ratio).toBeGreaterThan(0.5);
    });

    it('should return all tests when totalShards is 1', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: [], scenarios: 5, estimatedDurationMs: 10000 },
        { path: 'test2.feature', tags: [], scenarios: 3, estimatedDurationMs: 5000 },
      ];

      const shard = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 1 });

      expect(shard).toEqual(testFiles);
    });

    it('should throw error for invalid shard index', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: [], scenarios: 5, estimatedDurationMs: 10000 },
      ];

      expect(() => {
        runner.shardTests(testFiles, { shardIndex: 2, totalShards: 2 });
      }).toThrow('Invalid shard index');

      expect(() => {
        runner.shardTests(testFiles, { shardIndex: -1, totalShards: 2 });
      }).toThrow('Invalid shard index');
    });

    it('should handle 4 shards correctly', () => {
      const testFiles: TestFile[] = Array.from({ length: 12 }, (_, i) => ({
        path: `test${i + 1}.feature`,
        tags: [],
        scenarios: 3,
        estimatedDurationMs: 5000,
      }));

      const shards = Array.from({ length: 4 }, (_, i) =>
        runner.shardTests(testFiles, { shardIndex: i, totalShards: 4 })
      );

      // Each shard should have tests
      shards.forEach(shard => {
        expect(shard.length).toBeGreaterThan(0);
      });

      // Total tests should match
      const totalTests = shards.reduce((sum, shard) => sum + shard.length, 0);
      expect(totalTests).toBe(testFiles.length);

      // No duplicates across shards
      const allPaths = shards.flatMap(shard => shard.map(t => t.path));
      const uniquePaths = new Set(allPaths);
      expect(uniquePaths.size).toBe(testFiles.length);
    });
  });

  describe('filterByTags', () => {
    const testFiles: TestFile[] = [
      { path: 'test1.feature', tags: ['@smoke', '@critical'], scenarios: 3, estimatedDurationMs: 5000 },
      { path: 'test2.feature', tags: ['@regression'], scenarios: 5, estimatedDurationMs: 10000 },
      { path: 'test3.feature', tags: ['@smoke'], scenarios: 2, estimatedDurationMs: 3000 },
      { path: 'test4.feature', tags: ['@critical', '@regression'], scenarios: 4, estimatedDurationMs: 8000 },
    ];

    it('should filter by single tag', () => {
      const filtered = runner.filterByTags(testFiles, '@smoke');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].path).toBe('test1.feature');
      expect(filtered[1].path).toBe('test3.feature');
    });

    it('should filter by AND expression', () => {
      const filtered = runner.filterByTags(testFiles, '@critical and @regression');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].path).toBe('test4.feature');
    });

    it('should filter by OR expression', () => {
      const filtered = runner.filterByTags(testFiles, '@smoke or @critical');

      expect(filtered).toHaveLength(3);
      expect(filtered.map(t => t.path)).toContain('test1.feature');
      expect(filtered.map(t => t.path)).toContain('test3.feature');
      expect(filtered.map(t => t.path)).toContain('test4.feature');
    });

    it('should filter by NOT expression', () => {
      const filtered = runner.filterByTags(testFiles, 'not @smoke');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].path).toBe('test2.feature');
      expect(filtered[1].path).toBe('test4.feature');
    });

    it('should return all tests when no filter is provided', () => {
      const filtered = runner.filterByTags(testFiles, '');

      expect(filtered).toEqual(testFiles);
    });
  });

  describe('edge cases', () => {
    it('should handle empty test list', () => {
      const testFiles: TestFile[] = [];

      const prioritized = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical'],
        runCriticalFirst: true,
      });

      expect(prioritized).toEqual([]);
    });

    it('should handle tests with no tags', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: [], scenarios: 3, estimatedDurationMs: 5000 },
        { path: 'test2.feature', tags: [], scenarios: 2, estimatedDurationMs: 3000 },
      ];

      const prioritized = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical'],
        runCriticalFirst: true,
      });

      // Should sort by duration when no priority tags match
      expect(prioritized[0].estimatedDurationMs).toBe(3000);
      expect(prioritized[1].estimatedDurationMs).toBe(5000);
    });

    it('should handle tests with zero duration', () => {
      const testFiles: TestFile[] = [
        { path: 'test1.feature', tags: ['@smoke'], scenarios: 0, estimatedDurationMs: 0 },
        { path: 'test2.feature', tags: ['@smoke'], scenarios: 3, estimatedDurationMs: 5000 },
      ];

      const prioritized = runner.prioritizeTests(testFiles, {
        priorityTags: ['@smoke'],
        runCriticalFirst: true,
      });

      expect(prioritized).toHaveLength(2);
    });
  });
});
