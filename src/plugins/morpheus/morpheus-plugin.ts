/**
 * Morpheus plugin for development-time validation only.
 * Does NOT run during test execution - only via CLI commands.
 * 
 * @module plugins/morpheus/morpheus-plugin
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8
 */

import type { Plugin, PluginConfig, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';

/**
 * Configuration for the Morpheus plugin.
 */
export interface MorpheusPluginConfig extends PluginConfig {
  /** Morpheus MCP endpoint URL */
  readonly endpoint: string;
  
  /** Request timeout in milliseconds */
  readonly timeout: number;
}

/**
 * Morpheus query result from MCP.
 */
interface MorpheusQueryResult {
  found: boolean;
  matches: MorpheusMatch[];
  suggestions: string[];
}

/**
 * Match result from Morpheus query.
 */
export interface MorpheusMatch {
  type: string;
  path: string;
  content: string;
  similarity: number;
}

/**
 * Query log entry for audit purposes.
 */
export interface MorpheusQueryLog {
  timestamp: Date;
  type: string;
  query: string;
  found: boolean;
  matchCount: number;
}

/**
 * Validation result for a selector.
 */
export interface ValidationResult {
  selector: string;
  valid: boolean;
  suggestions?: string[];
  existingMatches?: MorpheusMatch[];
  error?: string;
}

/**
 * Morpheus plugin for development-time validation only.
 * Does NOT run during test execution - only via CLI commands.
 * 
 * Key features:
 * - Validates selectors against JouleTrack frontend codebase
 * - Finds similar step patterns to prevent duplicates
 * - Fetches CSS selectors from components
 * - Maintains query log for audit purposes
 * - No-op lifecycle methods (development-time only)
 * 
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8
 */
export class MorpheusPlugin implements Plugin {
  readonly name = 'morpheus';
  readonly version = '1.0.0';

  private readonly config: MorpheusPluginConfig;
  private readonly logger: StructuredLogger;
  private queryLog: MorpheusQueryLog[] = [];

  constructor(config: MorpheusPluginConfig, logger: StructuredLogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the plugin.
   * Morpheus is only used via CLI, not during test execution.
   */
  async initialize(): Promise<void> {
    this.logger.debug('Morpheus plugin initialized (development-time only)');
  }

  /**
   * Validate selectors against JouleTrack frontend codebase.
   * Called via: cli validate:selectors
   * 
   * @param selectors - Array of CSS selectors to validate
   * @returns Validation results for each selector
   * @requirements 19.1, 19.2, 19.3, 19.4
   */
  async validateSelectors(selectors: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const selector of selectors) {
      try {
        const result = await this.queryMorpheus('selector', selector);
        results.push({
          selector,
          valid: result.found,
          suggestions: result.suggestions || [],
          existingMatches: result.matches || [],
        });

        this.logQuery('selector', selector, result);
      } catch (error) {
        results.push({
          selector,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Find existing step patterns similar to a new pattern.
   * Called via: cli validate:steps
   * 
   * @param pattern - Step pattern to search for
   * @returns Array of similar step matches
   * @requirements 19.3
   */
  async findSimilarSteps(pattern: string): Promise<MorpheusMatch[]> {
    const result = await this.queryMorpheus('step', pattern);
    this.logQuery('step', pattern, result);
    return result.matches || [];
  }

  /**
   * Fetch CSS selector from JouleTrack frontend for a component.
   * 
   * @param componentPath - Path to component file
   * @returns CSS selector or null if not found
   * @requirements 19.4
   */
  async fetchSelector(componentPath: string): Promise<string | null> {
    const result = await this.queryMorpheus('component', componentPath);
    this.logQuery('component', componentPath, result);

    if (result.found && result.matches && result.matches.length > 0) {
      const firstMatch = result.matches[0];
      if (firstMatch) {
        return firstMatch.content;
      }
    }
    return null;
  }

  /**
   * Get the query log for audit purposes.
   * 
   * @returns Copy of the query log
   * @requirements 19.6
   */
  getQueryLog(): MorpheusQueryLog[] {
    return [...this.queryLog];
  }

  /**
   * Query Morpheus MCP for information.
   * 
   * @param type - Query type (selector, step, component)
   * @param query - Query string
   * @returns Query result
   */
  private async queryMorpheus(type: string, query: string): Promise<MorpheusQueryResult> {
    const response = await fetch(`${this.config.endpoint}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, query }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Morpheus query failed: ${response.statusText}`);
    }

    return await response.json() as MorpheusQueryResult;
  }

  /**
   * Log a query for audit purposes.
   * 
   * @param type - Query type
   * @param query - Query string
   * @param result - Query result
   */
  private logQuery(type: string, query: string, result: MorpheusQueryResult): void {
    this.queryLog.push({
      timestamp: new Date(),
      type,
      query,
      found: result.found,
      matchCount: result.matches?.length || 0,
    });
  }

  // Plugin lifecycle methods (no-op for development-time plugin)
  // These methods do nothing because Morpheus only runs via CLI commands

  /**
   * No-op: Morpheus does not run during test execution.
   */
  async onTestStart(_testId: string, _testName: string): Promise<void> {
    // No-op: development-time only
  }

  /**
   * No-op: Morpheus does not run during test execution.
   */
  async onTestEnd(_testId: string, _status: TestStatus, _duration: number): Promise<void> {
    // No-op: development-time only
  }

  /**
   * No-op: Morpheus does not run during test execution.
   */
  async onStepExecuted(_step: StepInfo): Promise<void> {
    // No-op: development-time only
  }

  /**
   * No-op: Morpheus does not run during test execution.
   */
  async onError(_error: Error, _context: ErrorContext): Promise<void> {
    // No-op: development-time only
  }

  /**
   * No-op: Morpheus does not run during test execution.
   */
  async flush(): Promise<void> {
    // No-op: development-time only
  }

  /**
   * No-op: Morpheus does not run during test execution.
   */
  async dispose(): Promise<void> {
    // No-op: development-time only
  }
}
