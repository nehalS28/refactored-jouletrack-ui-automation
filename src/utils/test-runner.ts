/**
 * Test runner utility for test prioritization and sharding.
 * Supports distributing tests across multiple CI agents with balanced execution time.
 * 
 * @module utils/test-runner
 * @requirements 20.3, 20.4, 20.5
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SQLiteStore } from '../plugins/metrics/sqlite-store.js';

/**
 * Recursively find all .feature files in a directory.
 */
async function findFeatureFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findFeatureFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.feature')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
  
  return files;
}

/**
 * Test file information with historical execution time.
 */
export interface TestFile {
  path: string;
  tags: string[];
  scenarios: number;
  estimatedDurationMs: number;
}

/**
 * Test shard configuration.
 */
export interface ShardConfig {
  shardIndex: number;
  totalShards: number;
}

/**
 * Test prioritization configuration.
 */
export interface PrioritizationConfig {
  priorityTags: string[];
  runCriticalFirst: boolean;
}

/**
 * Test runner for prioritization and sharding.
 * 
 * Features:
 * - Prioritize tests by tags (critical tests run first)
 * - Distribute tests across multiple shards
 * - Balance test distribution based on historical execution time
 * - Support tag filtering
 * 
 * @requirements 20.3, 20.4, 20.5
 */
export class TestRunner {
  private readonly metricsStore: SQLiteStore;
  private readonly featuresPath: string;

  constructor(featuresPath: string = 'features', metricsDbPath: string = '.cache/metrics.db') {
    this.featuresPath = featuresPath;
    this.metricsStore = new SQLiteStore({ dbPath: metricsDbPath });
  }

  /**
   * Initialize the test runner.
   */
  async initialize(): Promise<void> {
    await this.metricsStore.initialize();
  }

  /**
   * Get all test files with metadata.
   * 
   * @returns Array of test files with tags and estimated duration
   */
  async getTestFiles(): Promise<TestFile[]> {
    const featureFiles = await findFeatureFiles(this.featuresPath);
    const testFiles: TestFile[] = [];

    for (const filePath of featureFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const tags = this.extractTags(content);
      const scenarios = this.countScenarios(content);
      const estimatedDurationMs = await this.estimateDuration(filePath, scenarios);

      testFiles.push({
        path: filePath,
        tags,
        scenarios,
        estimatedDurationMs,
      });
    }

    return testFiles;
  }

  /**
   * Prioritize tests based on tags.
   * Critical and smoke tests run first.
   * 
   * @param testFiles - Array of test files
   * @param config - Prioritization configuration
   * @returns Prioritized array of test files
   * @requirements 20.3
   */
  prioritizeTests(testFiles: TestFile[], config: PrioritizationConfig): TestFile[] {
    if (!config.runCriticalFirst) {
      return testFiles;
    }

    const { priorityTags } = config;

    // Sort tests by priority
    return [...testFiles].sort((a, b) => {
      const aPriority = this.calculatePriority(a.tags, priorityTags);
      const bPriority = this.calculatePriority(b.tags, priorityTags);

      // Higher priority first
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Same priority, sort by estimated duration (shorter first for faster feedback)
      return a.estimatedDurationMs - b.estimatedDurationMs;
    });
  }

  /**
   * Shard tests across multiple CI agents.
   * Balances test distribution based on historical execution time.
   * 
   * @param testFiles - Array of test files
   * @param config - Shard configuration
   * @returns Test files for the specified shard
   * @requirements 20.4, 20.5
   */
  shardTests(testFiles: TestFile[], config: ShardConfig): TestFile[] {
    const { shardIndex, totalShards } = config;

    if (totalShards <= 1) {
      return testFiles;
    }

    if (shardIndex < 0 || shardIndex >= totalShards) {
      throw new Error(`Invalid shard index: ${shardIndex}. Must be between 0 and ${totalShards - 1}`);
    }

    // Sort tests by estimated duration (longest first for better balancing)
    const sortedTests = [...testFiles].sort((a, b) => b.estimatedDurationMs - a.estimatedDurationMs);

    // Initialize shards
    const shards: TestFile[][] = Array.from({ length: totalShards }, () => []);
    const shardDurations: number[] = Array(totalShards).fill(0);

    // Distribute tests using greedy algorithm (assign to shard with least total duration)
    for (const test of sortedTests) {
      // Find shard with minimum duration
      const minShardIndex = shardDurations.indexOf(Math.min(...shardDurations));
      
      // Assign test to that shard
      const targetShard = shards[minShardIndex];
      const targetDuration = shardDurations[minShardIndex];
      
      if (!targetShard || targetDuration === undefined) {
        throw new Error(`Invalid shard index: ${minShardIndex}`);
      }
      
      targetShard.push(test);
      shardDurations[minShardIndex] = targetDuration + test.estimatedDurationMs;
    }

    // Log shard distribution
    const selectedShard = shards[shardIndex];
    const selectedDuration = shardDurations[shardIndex];
    
    if (!selectedShard || selectedDuration === undefined) {
      throw new Error(`Shard ${shardIndex} not found`);
    }
    
    console.log(`Shard ${shardIndex + 1}/${totalShards}:`);
    console.log(`  Tests: ${selectedShard.length}`);
    console.log(`  Estimated duration: ${(selectedDuration / 1000).toFixed(1)}s`);
    console.log(`  Balance: ${this.calculateBalance(shardDurations).toFixed(1)}%`);

    return selectedShard;
  }

  /**
   * Filter tests by tag expression.
   * Supports AND, OR, NOT operators.
   * 
   * @param testFiles - Array of test files
   * @param tagExpression - Tag filter expression (e.g., "@smoke", "@critical and @regression")
   * @returns Filtered array of test files
   * @requirements 20.1
   */
  filterByTags(testFiles: TestFile[], tagExpression: string): TestFile[] {
    if (!tagExpression) {
      return testFiles;
    }

    return testFiles.filter(test => this.matchesTagExpression(test.tags, tagExpression));
  }

  /**
   * Extract tags from feature file content.
   * 
   * @param content - Feature file content
   * @returns Array of tags
   */
  private extractTags(content: string): string[] {
    const tagRegex = /@[\w-]+/g;
    const matches = content.match(tagRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Count scenarios in feature file.
   * 
   * @param content - Feature file content
   * @returns Number of scenarios
   */
  private countScenarios(content: string): number {
    const scenarioRegex = /^\s*(Scenario|Scenario Outline):/gm;
    const matches = content.match(scenarioRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Estimate test duration based on historical data.
   * Falls back to scenario count * average scenario duration if no history.
   * 
   * @param filePath - Feature file path
   * @param scenarios - Number of scenarios
   * @returns Estimated duration in milliseconds
   * @requirements 20.5
   */
  private async estimateDuration(filePath: string, scenarios: number): Promise<number> {
    // Try to get historical average from metrics database
    const testId = this.filePathToTestId(filePath);
    const historical = await this.metricsStore.getHistoricalAverage(testId);

    if (historical !== null) {
      return historical;
    }

    // Fallback: estimate based on scenario count
    // Assume average scenario takes 5 seconds
    const AVERAGE_SCENARIO_DURATION_MS = 5000;
    return scenarios * AVERAGE_SCENARIO_DURATION_MS;
  }

  /**
   * Convert file path to test ID.
   * 
   * @param filePath - Feature file path
   * @returns Test ID
   */
  private filePathToTestId(filePath: string): string {
    return filePath.replace(/\//g, '_').replace(/\.feature$/, '');
  }

  /**
   * Calculate priority score for a test based on its tags.
   * Higher score = higher priority.
   * 
   * @param tags - Test tags
   * @param priorityTags - Priority tags in order of importance
   * @returns Priority score
   */
  private calculatePriority(tags: string[], priorityTags: string[]): number {
    let score = 0;

    for (let i = 0; i < priorityTags.length; i++) {
      const priorityTag = priorityTags[i];
      if (priorityTag && tags.includes(priorityTag)) {
        // Higher weight for earlier priority tags
        score += (priorityTags.length - i) * 10;
      }
    }

    return score;
  }

  /**
   * Check if tags match a tag expression.
   * Supports AND, OR, NOT operators.
   * 
   * @param tags - Test tags
   * @param expression - Tag expression
   * @returns True if tags match expression
   */
  private matchesTagExpression(tags: string[], expression: string): boolean {
    // Simple implementation for common cases
    // Full implementation would use a proper expression parser

    // Handle "not @tag"
    if (expression.startsWith('not ')) {
      const tag = expression.substring(4).trim();
      return !tags.includes(tag);
    }

    // Handle "@tag1 and @tag2"
    if (expression.includes(' and ')) {
      const requiredTags = expression.split(' and ').map(t => t.trim());
      return requiredTags.every(tag => tags.includes(tag));
    }

    // Handle "@tag1 or @tag2"
    if (expression.includes(' or ')) {
      const anyTags = expression.split(' or ').map(t => t.trim());
      return anyTags.some(tag => tags.includes(tag));
    }

    // Single tag
    return tags.includes(expression);
  }

  /**
   * Calculate balance percentage across shards.
   * 100% = perfectly balanced, lower = more imbalanced.
   * 
   * @param shardDurations - Duration for each shard
   * @returns Balance percentage
   */
  private calculateBalance(shardDurations: number[]): number {
    if (shardDurations.length === 0) return 100;

    const max = Math.max(...shardDurations);
    const min = Math.min(...shardDurations);

    if (max === 0) return 100;

    return (min / max) * 100;
  }

  /**
   * Close the test runner and clean up resources.
   */
  async close(): Promise<void> {
    await this.metricsStore.close();
  }
}

/**
 * CLI helper to run tests with prioritization and sharding.
 * 
 * Usage:
 *   # Run all tests
 *   npm test
 * 
 *   # Run only smoke tests
 *   TAG_FILTER="@smoke" npm test
 * 
 *   # Run critical tests first
 *   PRIORITY_TAGS="@critical,@smoke" npm test
 * 
 *   # Run shard 1 of 4
 *   SHARD_INDEX=0 TOTAL_SHARDS=4 npm test
 * 
 *   # Combine: Run critical smoke tests on shard 1 of 4
 *   TAG_FILTER="@smoke" PRIORITY_TAGS="@critical" SHARD_INDEX=0 TOTAL_SHARDS=4 npm test
 */
export async function runTests(): Promise<void> {
  const runner = new TestRunner();
  await runner.initialize();

  try {
    // Get all test files
    let testFiles: TestFile[] = await runner.getTestFiles();

    // Apply tag filtering
    const tagFilter = process.env['TAG_FILTER'];
    if (tagFilter) {
      testFiles = runner.filterByTags(testFiles, tagFilter);
      console.log(`Filtered to ${testFiles.length} tests matching: ${tagFilter}`);
    }

    // Apply prioritization
    const priorityTags = process.env['PRIORITY_TAGS']?.split(',') || ['@critical', '@smoke'];
    const runCriticalFirst = process.env['RUN_CRITICAL_FIRST'] !== 'false';
    testFiles = runner.prioritizeTests(testFiles, { priorityTags, runCriticalFirst });

    // Apply sharding
    const shardIndex = process.env['SHARD_INDEX'] ? parseInt(process.env['SHARD_INDEX']) : undefined;
    const totalShards = process.env['TOTAL_SHARDS'] ? parseInt(process.env['TOTAL_SHARDS']) : undefined;

    if (shardIndex !== undefined && totalShards !== undefined) {
      testFiles = runner.shardTests(testFiles, { shardIndex, totalShards });
    }

    // Output test file paths for Cucumber
    const testPaths = testFiles.map(t => t.path).join(' ');
    console.log('\nTest files to run:');
    testFiles.forEach(t => {
      console.log(`  ${t.path} (${t.scenarios} scenarios, ~${(t.estimatedDurationMs / 1000).toFixed(1)}s)`);
    });
    console.log(`\nTotal: ${testFiles.length} files, ${testFiles.reduce((sum, t) => sum + t.scenarios, 0)} scenarios`);
    console.log(`Estimated duration: ${(testFiles.reduce((sum, t) => sum + t.estimatedDurationMs, 0) / 1000).toFixed(1)}s`);

    // Write test paths to file for Cucumber to consume
    await fs.writeFile('.cache/test-paths.txt', testPaths);
  } finally {
    await runner.close();
  }
}
