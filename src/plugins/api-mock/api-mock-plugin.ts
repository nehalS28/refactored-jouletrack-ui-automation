/**
 * ApiMockPlugin implementation for mocking API endpoints during tests.
 * Provides network interception, configurable responses, delay simulation,
 * and automatic mock clearing for test isolation.
 * 
 * @module plugins/api-mock/api-mock-plugin
 * @requirements 15.2
 */

import type { Plugin, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';

/**
 * Configuration for the ApiMockPlugin.
 */
export interface ApiMockPluginConfig {
  readonly enabled: boolean;
  readonly defaultDelay?: number | undefined;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: ApiMockPluginConfig = {
  enabled: true,
};

/**
 * Mock response definition.
 */
export interface MockResponse {
  /** HTTP status code */
  readonly status: number;
  /** Response body (can be any JSON-serializable value) */
  readonly body?: unknown;
  /** Response headers */
  readonly headers?: Record<string, string>;
}

/**
 * Mock endpoint definition.
 */
export interface MockDefinition {
  /** URL pattern to match (exact string, regex, or glob pattern) */
  readonly urlPattern: string | RegExp;
  /** HTTP method to match (optional, matches all methods if not specified) */
  readonly method?: string;
  /** Response to return when matched */
  readonly response: MockResponse;
  /** Delay in milliseconds before returning response (optional) */
  readonly delay?: number;
}

/**
 * Internal mock entry with compiled pattern.
 */
interface MockEntry {
  readonly urlPattern: string | RegExp;
  readonly compiledPattern: RegExp;
  readonly method: string | undefined;
  readonly response: MockResponse;
  readonly delay: number | undefined;
}

/**
 * Result from getMockWithDelay including delay information.
 */
export interface MockWithDelay {
  readonly response: MockResponse;
  readonly delay: number | undefined;
}

/**
 * ApiMockPlugin implementation for mocking API endpoints during tests.
 * 
 * Features:
 * - Mock API endpoints with configurable responses
 * - Support URL pattern matching (exact, regex, glob patterns)
 * - Support HTTP method filtering
 * - Support delay simulation for network latency
 * - Automatic mock clearing after each test for isolation
 * 
 * @requirements 15.2
 */
export class ApiMockPlugin implements Plugin {
  readonly name = 'api-mock';
  readonly version = '1.0.0';

  private readonly config: ApiMockPluginConfig;
  private readonly logger: StructuredLogger;
  private mocks: MockEntry[] = [];

  constructor(config: Partial<ApiMockPluginConfig> | undefined, logger: StructuredLogger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Initialize the plugin.
   */
  async initialize(): Promise<void> {
    this.mocks = [];
    this.logger.info('API Mock plugin initialized', {
      enabled: this.config.enabled,
      defaultDelay: this.config.defaultDelay,
    });
  }

  /**
   * Register a mock endpoint.
   * 
   * @param definition - Mock definition with URL pattern, method, response, and delay
   */
  mockEndpoint(definition: MockDefinition): void {
    const compiledPattern = this.compilePattern(definition.urlPattern);
    const method = definition.method?.toUpperCase();
    const delay = definition.delay ?? this.config.defaultDelay;
    
    const entry: MockEntry = {
      urlPattern: definition.urlPattern,
      compiledPattern,
      method,
      response: definition.response,
      delay,
    };

    this.mocks.push(entry);

    this.logger.debug('Mock endpoint registered', {
      urlPattern: definition.urlPattern instanceof RegExp 
        ? definition.urlPattern.toString() 
        : definition.urlPattern,
      method: definition.method ?? 'ANY',
      status: definition.response.status,
      delay: entry.delay,
    });
  }

  /**
   * Get a mock response for a URL and method.
   * 
   * @param url - URL to match
   * @param method - HTTP method
   * @returns Mock response or null if no match
   */
  getMock(url: string, method: string): MockResponse | null {
    const result = this.getMockWithDelay(url, method);
    return result?.response ?? null;
  }

  /**
   * Get a mock response with delay information.
   * 
   * @param url - URL to match
   * @param method - HTTP method
   * @returns Mock response with delay or null if no match
   */
  getMockWithDelay(url: string, method: string): MockWithDelay | null {
    if (!url) {
      return null;
    }

    const normalizedMethod = method.toUpperCase();

    for (const mock of this.mocks) {
      // Check method match
      if (mock.method !== undefined && mock.method !== normalizedMethod) {
        continue;
      }

      // Check URL pattern match
      if (mock.compiledPattern.test(url)) {
        return {
          response: mock.response,
          delay: mock.delay,
        };
      }
    }

    return null;
  }

  /**
   * Clear all registered mocks.
   */
  clearMocks(): void {
    const count = this.mocks.length;
    this.mocks = [];
    
    this.logger.debug('All mocks cleared', { clearedCount: count });
  }

  /**
   * Get the number of registered mocks.
   * 
   * @returns Number of registered mocks
   */
  getMockCount(): number {
    return this.mocks.length;
  }

  /**
   * Called when a test starts.
   * 
   * @param testId - Unique test identifier
   * @param testName - Human-readable test name
   */
  async onTestStart(testId: string, testName: string): Promise<void> {
    this.logger.debug('API Mock test started', { testId, testName });
  }

  /**
   * Called when a test ends.
   * Clears all mocks for test isolation.
   * 
   * @param testId - Unique test identifier
   * @param status - Test execution status
   * @param duration - Test execution duration in milliseconds
   */
  async onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void> {
    this.clearMocks();
    this.logger.debug('API Mock test ended, mocks cleared', { testId, status, duration });
  }

  /**
   * Called after each step is executed.
   * API Mock plugin doesn't need to track step execution.
   * 
   * @param _step - Step execution information
   */
  async onStepExecuted(_step: StepInfo): Promise<void> {
    // API Mock plugin doesn't need to track step execution
  }

  /**
   * Called when an error occurs.
   * API Mock plugin doesn't need to handle errors.
   * 
   * @param _error - The error that occurred
   * @param _context - Error context information
   */
  async onError(_error: Error, _context: ErrorContext): Promise<void> {
    // API Mock plugin doesn't need to handle errors
  }

  /**
   * Flush any buffered data.
   */
  async flush(): Promise<void> {
    this.logger.debug('API Mock plugin flushed');
  }

  /**
   * Dispose the plugin and clean up resources.
   */
  async dispose(): Promise<void> {
    this.clearMocks();
    this.logger.info('API Mock plugin disposed');
  }

  /**
   * Compile a URL pattern into a RegExp.
   * Supports:
   * - Exact string match
   * - RegExp patterns
   * - Glob patterns (* for single segment, ** for multiple segments)
   * 
   * @param pattern - URL pattern to compile
   * @returns Compiled RegExp
   */
  private compilePattern(pattern: string | RegExp): RegExp {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    // Use placeholders to handle ** before * to avoid conflicts
    const DOUBLE_STAR_PLACEHOLDER = '\x00DOUBLE_STAR\x00';
    const SINGLE_STAR_PLACEHOLDER = '\x00SINGLE_STAR\x00';

    // Replace ** and * with placeholders before escaping
    let regexStr = pattern
      .replace(/\*\*/g, DOUBLE_STAR_PLACEHOLDER)
      .replace(/\*/g, SINGLE_STAR_PLACEHOLDER);

    // Escape special regex characters
    regexStr = regexStr.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

    // Replace placeholders with regex patterns
    // ** matches any path segments (including /)
    regexStr = regexStr.replace(new RegExp(DOUBLE_STAR_PLACEHOLDER, 'g'), '.*');
    
    // * matches single path segment (excluding /)
    regexStr = regexStr.replace(new RegExp(SINGLE_STAR_PLACEHOLDER, 'g'), '[^/]+');

    // Exact match (anchor to start and end)
    return new RegExp(`^${regexStr}$`);
  }
}
