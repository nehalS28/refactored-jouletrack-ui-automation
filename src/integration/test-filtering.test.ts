/**
 * Integration tests for test categorization and filtering.
 * Tests tag filtering, test prioritization, and test sharding end-to-end.
 * 
 * @module integration/test-filtering.test
 * @requirements 20.1, 20.3, 20.4, 20.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestRunner, type TestFile } from '../utils/test-runner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Test Filtering Integration', () => {
  let runner: TestRunner;
  const testFeaturesPath = '.cache/test-features';

  beforeAll(async () => {
    // Create temporary feature files for testing
    await fs.mkdir(testFeaturesPath, { recursive: true });

    // Create test feature files with different tags
    await fs.writeFile(
      path.join(testFeaturesPath, 'critical-smoke.feature'),
      `@critical @smoke @domain-authentication
Feature: Critical Smoke Test
  Scenario: Test 1
    Given a test
  Scenario: Test 2
    Given another test`
    );

    await fs.writeFile(
      path.join(testFeaturesPath, 'smoke-only.feature'),
      `@smoke @domain-dashboard
Feature: Smoke Only Test
  Scenario: Test 1
    Given a test`
    );

    await fs.writeFile(
      path.join(testFeaturesPath, 'regression.feature'),
      `@regression @domain-reports
Feature: Regression Test
  Scenario: Test 1
    Given a test
  Scenario: Test 2
    Given another test
  Scenario: Test 3
    Given yet another test`
    );

    await fs.writeFile(
      path.join(testFeaturesPath, 'critical-regression.feature'),
      `@critical @regression @domain-settings
Feature: Critical Regression Test
  Scenario: Test 1
    Given a test
  Scenario: Test 2
    Given another test`
    );

    runner = new TestRunner(testFeaturesPath, ':memory:');
    await runner.initialize();
  });

  afterAll(async () => {
    await runner.close();
    // Clean up test files
    await fs.rm(testFeaturesPath, { recursive: true, force: true });
  });

  describe('Tag Filtering', () => {
    it('should filter tests by single tag', async () => {
      const testFiles = await runner.getTestFiles();
      const filtered = runner.filterByTags(testFiles, '@smoke');

      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => path.basename(t.path))).toContain('critical-smoke.feature');
      expect(filtered.map(t => path.basename(t.path))).toContain('smoke-only.feature');
    });

    it('should filter tests by AND expression', async () => {
      const testFiles = await runner.getTestFiles();
      const filtered = runner.filterByTags(testFiles, '@critical and @smoke');

      expect(filtered).toHaveLength(1);
      expect(path.basename(filtered[0].path)).toBe('critical-smoke.feature');
    });

    it('should filter tests by OR expression', async () => {
      const testFiles = await runner.getTestFiles();
      const filtered = runner.filterByTags(testFiles, '@smoke or @critical');

      expect(filtered).toHaveLength(3);
      const basenames = filtered.map(t => path.basename(t.path));
      expect(basenames).toContain('critical-smoke.feature');
      expect(basenames).toContain('smoke-only.feature');
      expect(basenames).toContain('critical-regression.feature');
    });

    it('should filter tests by NOT expression', async () => {
      const testFiles = await runner.getTestFiles();
      const filtered = runner.filterByTags(testFiles, 'not @smoke');

      expect(filtered).toHaveLength(2);
      const basenames = filtered.map(t => path.basename(t.path));
      expect(basenames).toContain('regression.feature');
      expect(basenames).toContain('critical-regression.feature');
    });

    it('should filter by domain-specific tags', async () => {
      const testFiles = await runner.getTestFiles();
      const filtered = runner.filterByTags(testFiles, '@domain-authentication');

      expect(filtered).toHaveLength(1);
      expect(path.basename(filtered[0].path)).toBe('critical-smoke.feature');
    });
  });

  describe('Test Prioritization', () => {
    it('should run critical tests first', async () => {
      const testFiles = await runner.getTestFiles();
      const prioritized = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical', '@smoke'],
        runCriticalFirst: true,
      });

      // Critical + smoke should be first
      expect(path.basename(prioritized[0].path)).toBe('critical-smoke.feature');

      // Critical + regression should be second (critical but not smoke)
      expect(path.basename(prioritized[1].path)).toBe('critical-regression.feature');

      // Smoke only should be third
      expect(path.basename(prioritized[2].path)).toBe('smoke-only.feature');

      // Regression only should be last
      expect(path.basename(prioritized[3].path)).toBe('regression.feature');
    });

    it('should prioritize by multiple tags in order', async () => {
      const testFiles = await runner.getTestFiles();
      const prioritized = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical', '@smoke', '@regression'],
        runCriticalFirst: true,
      });

      // All tests with @critical should come before tests without @critical
      const criticalTests = prioritized.filter(t => t.tags.includes('@critical'));
      const nonCriticalTests = prioritized.filter(t => !t.tags.includes('@critical'));

      const lastCriticalIndex = prioritized.indexOf(criticalTests[criticalTests.length - 1]);
      const firstNonCriticalIndex = prioritized.indexOf(nonCriticalTests[0]);

      expect(lastCriticalIndex).toBeLessThan(firstNonCriticalIndex);
    });

    it('should maintain order when prioritization is disabled', async () => {
      const testFiles = await runner.getTestFiles();
      const originalOrder = testFiles.map(t => t.path);

      const prioritized = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical'],
        runCriticalFirst: false,
      });

      expect(prioritized.map(t => t.path)).toEqual(originalOrder);
    });
  });

  describe('Test Sharding', () => {
    it('should distribute tests across 2 shards', async () => {
      const testFiles = await runner.getTestFiles();

      const shard1 = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });
      const shard2 = runner.shardTests(testFiles, { shardIndex: 1, totalShards: 2 });

      // Each shard should have tests
      expect(shard1.length).toBeGreaterThan(0);
      expect(shard2.length).toBeGreaterThan(0);

      // Total tests should match
      expect(shard1.length + shard2.length).toBe(testFiles.length);

      // No duplicates
      const shard1Paths = shard1.map(t => t.path);
      const shard2Paths = shard2.map(t => t.path);
      const intersection = shard1Paths.filter(p => shard2Paths.includes(p));
      expect(intersection).toHaveLength(0);
    });

    it('should balance test distribution by scenario count', async () => {
      const testFiles = await runner.getTestFiles();

      const shard1 = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });
      const shard2 = runner.shardTests(testFiles, { shardIndex: 1, totalShards: 2 });

      const shard1Scenarios = shard1.reduce((sum, t) => sum + t.scenarios, 0);
      const shard2Scenarios = shard2.reduce((sum, t) => sum + t.scenarios, 0);

      // Scenario counts should be relatively balanced
      const totalScenarios = shard1Scenarios + shard2Scenarios;
      const expectedPerShard = totalScenarios / 2;
      const tolerance = expectedPerShard * 0.5; // 50% tolerance

      expect(Math.abs(shard1Scenarios - expectedPerShard)).toBeLessThan(tolerance);
      expect(Math.abs(shard2Scenarios - expectedPerShard)).toBeLessThan(tolerance);
    });

    it('should distribute tests across 4 shards', async () => {
      const testFiles = await runner.getTestFiles();

      const shards = Array.from({ length: 4 }, (_, i) =>
        runner.shardTests(testFiles, { shardIndex: i, totalShards: 4 })
      );

      // Each shard should have at least one test (we have 4 test files)
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

  describe('Combined Filtering, Prioritization, and Sharding', () => {
    it('should apply tag filter, then prioritize, then shard', async () => {
      let testFiles = await runner.getTestFiles();

      // Step 1: Filter by tag
      testFiles = runner.filterByTags(testFiles, '@critical or @smoke');
      expect(testFiles.length).toBe(3); // critical-smoke, smoke-only, critical-regression

      // Step 2: Prioritize
      testFiles = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical', '@smoke'],
        runCriticalFirst: true,
      });

      // Step 3: Shard
      const shard1 = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });
      const shard2 = runner.shardTests(testFiles, { shardIndex: 1, totalShards: 2 });

      // Verify sharding worked on filtered and prioritized tests
      expect(shard1.length + shard2.length).toBe(3);
    });

    it('should handle empty result after filtering', async () => {
      let testFiles = await runner.getTestFiles();

      // Filter by non-existent tag
      testFiles = runner.filterByTags(testFiles, '@nonexistent');
      expect(testFiles).toHaveLength(0);

      // Prioritize empty list
      testFiles = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical'],
        runCriticalFirst: true,
      });
      expect(testFiles).toHaveLength(0);

      // Shard empty list
      const shard = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });
      expect(shard).toHaveLength(0);
    });
  });

  describe('Test File Metadata', () => {
    it('should extract tags correctly', async () => {
      const testFiles = await runner.getTestFiles();
      const criticalSmoke = testFiles.find(t => path.basename(t.path) === 'critical-smoke.feature');

      expect(criticalSmoke).toBeDefined();
      expect(criticalSmoke!.tags).toContain('@critical');
      expect(criticalSmoke!.tags).toContain('@smoke');
      expect(criticalSmoke!.tags).toContain('@domain-authentication');
    });

    it('should count scenarios correctly', async () => {
      const testFiles = await runner.getTestFiles();
      const regression = testFiles.find(t => path.basename(t.path) === 'regression.feature');

      expect(regression).toBeDefined();
      expect(regression!.scenarios).toBe(3);
    });

    it('should estimate duration for tests without history', async () => {
      const testFiles = await runner.getTestFiles();

      // All tests should have estimated duration (fallback to scenario count * 5000ms)
      testFiles.forEach(test => {
        expect(test.estimatedDurationMs).toBeGreaterThan(0);
        // Should be roughly scenarios * 5000ms
        const expectedDuration = test.scenarios * 5000;
        expect(test.estimatedDurationMs).toBe(expectedDuration);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should support CI pipeline with smoke tests on shard 1', async () => {
      let testFiles = await runner.getTestFiles();

      // CI wants to run smoke tests first on shard 1
      testFiles = runner.filterByTags(testFiles, '@smoke');
      testFiles = runner.prioritizeTests(testFiles, {
        priorityTags: ['@critical'],
        runCriticalFirst: true,
      });

      const shard1 = runner.shardTests(testFiles, { shardIndex: 0, totalShards: 2 });

      // Shard 1 should have smoke tests
      expect(shard1.length).toBeGreaterThan(0);
      shard1.forEach(test => {
        expect(test.tags).toContain('@smoke');
      });
    });

    it('should support running critical tests across all domains', async () => {
      let testFiles = await runner.getTestFiles();

      // Filter for critical tests
      testFiles = runner.filterByTags(testFiles, '@critical');

      // Should have critical tests from different domains
      expect(testFiles.length).toBe(2);
      const domains = testFiles.flatMap(t => t.tags.filter(tag => tag.startsWith('@domain-')));
      expect(new Set(domains).size).toBeGreaterThan(1); // Multiple domains
    });

    it('should support regression suite distributed across 4 CI agents', async () => {
      let testFiles = await runner.getTestFiles();

      // Filter for regression tests
      testFiles = runner.filterByTags(testFiles, '@regression');

      // Distribute across 4 shards
      const shards = Array.from({ length: 4 }, (_, i) =>
        runner.shardTests(testFiles, { shardIndex: i, totalShards: 4 })
      );

      // All regression tests should be distributed
      const totalTests = shards.reduce((sum, shard) => sum + shard.length, 0);
      expect(totalTests).toBe(testFiles.length);
    });
  });
});
