/**
 * Cucumber configuration for parallel test execution with tag filtering and test prioritization.
 * Loads worker count and other settings from framework configuration.
 * 
 * @module cucumber.config
 * @requirements 15.1, 15.2, 15.3, 20.1, 20.3
 */

import { loadConfig } from './src/core/config-manager.js';

// Load framework configuration
const frameworkConfig = loadConfig();

// Determine parallel worker count
const parallelWorkers = frameworkConfig.parallel.enabled 
  ? frameworkConfig.parallel.workers 
  : 1;

// Tag filtering from environment variables
// Examples:
//   TAG_FILTER="@smoke" - Run only smoke tests
//   TAG_FILTER="@critical and @regression" - Run critical regression tests
//   TAG_FILTER="@smoke or @critical" - Run smoke OR critical tests
//   TAG_FILTER="not @skip" - Run all tests except those tagged @skip
const tagFilter = process.env.TAG_FILTER || undefined;

// Test prioritization order (critical tests run first)
// Cucumber runs tests in the order they appear in feature files,
// but we can use tag filtering to run critical tests first
const priorityTags = process.env.PRIORITY_TAGS?.split(',') || ['@critical', '@smoke'];

/**
 * Cucumber configuration with parallel execution support and tag filtering.
 * 
 * Key features:
 * - Parallel execution with configurable worker count
 * - Each worker gets its own TestContext (worker-scoped)
 * - Feature-level parallelization
 * - Tag-based test filtering (@smoke, @regression, @critical, @domain-specific)
 * - Test prioritization (critical tests run first)
 * - Multiple output formats (progress, JSON, HTML)
 * 
 * @requirements 15.1, 15.2, 15.3, 20.1, 20.3
 */
const config = {
  // Parallel execution configuration
  parallel: parallelWorkers,

  // Feature file paths
  paths: ['features/**/*.feature'],

  // Step definition paths
  require: ['dist/src/steps/**/*.steps.js'],

  // Module resolution
  requireModule: ['ts-node/register'],

  // Tag filtering (supports AND, OR, NOT expressions)
  // Examples:
  //   "@smoke" - Run only smoke tests
  //   "@critical and @regression" - Run critical regression tests
  //   "@smoke or @critical" - Run smoke OR critical tests
  //   "not @skip" - Run all tests except those tagged @skip
  tags: tagFilter,

  // Output formats
  format: [
    'progress-bar',
    'json:reports/cucumber-report.json',
    'html:reports/cucumber-report.html',
    'junit:reports/junit/cucumber-results.xml',
  ],

  // Publish results to Cucumber Reports (optional)
  publish: false,

  // Fail fast on first failure (disabled for parallel)
  failFast: false,

  // Strict mode - treat undefined steps as failures
  strict: true,

  // Dry run mode (for validation)
  dryRun: false,

  // World parameters - passed to TestContext
  worldParameters: {
    environment: frameworkConfig.environment,
    baseUrl: frameworkConfig.baseUrl,
    parallel: frameworkConfig.parallel,
    logging: frameworkConfig.logging,
    priorityTags, // Pass priority tags for test ordering
  },

  // Retry failed scenarios
  retry: frameworkConfig.retry?.maxAttempts ?? 0,

  // Retry only failed scenarios
  retryTagFilter: '@flaky',
};

export default config;
