/**
 * Configuration type definitions for the UI automation framework.
 * Provides type-safe configuration management with environment support.
 * 
 * @module types/config
 * @requirements 7.1, 7.2, 7.4, 7.5, 14.2
 */

/**
 * Supported execution environments.
 */
export type Environment = 'local' | 'ci' | 'staging' | 'production';

/**
 * Supported browser types.
 */
export type BrowserName = 'chrome' | 'firefox' | 'edge' | 'safari';

/**
 * Log level configuration.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Browser configuration options.
 * 
 * @requirements 3.4
 */
export interface BrowserConfig {
  /** Browser type to use */
  readonly name: BrowserName;
  
  /** Run browser in headless mode */
  readonly headless: boolean;
  
  /** Browser window dimensions */
  readonly windowSize: {
    readonly width: number;
    readonly height: number;
  };
  
  /** Additional browser arguments */
  readonly args: readonly string[];
}

/**
 * Timeout configuration for various operations.
 * 
 * @requirements 5.3
 */
export interface TimeoutConfig {
  /** Implicit wait timeout (milliseconds) */
  readonly implicit: number;
  
  /** Explicit wait timeout (milliseconds) */
  readonly explicit: number;
  
  /** Page load timeout (milliseconds) */
  readonly pageLoad: number;
  
  /** Script execution timeout (milliseconds) */
  readonly script: number;
  
  /** Polling interval for waits (milliseconds) */
  readonly polling: number;
}

/**
 * Retry configuration for flaky operations.
 * 
 * @requirements 4.5, 3.6
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  
  /** Initial backoff delay (milliseconds) */
  readonly backoffMs: number;
  
  /** Multiplier for exponential backoff */
  readonly backoffMultiplier: number;
}

/**
 * Parallel execution configuration.
 * 
 * @requirements 15.1, 15.2
 */
export interface ParallelConfig {
  /** Enable parallel test execution */
  readonly enabled: boolean;
  
  /** Number of parallel workers */
  readonly workers: number;
}

/**
 * Logging configuration.
 * 
 * @requirements 10.1, 10.2
 */
export interface LoggingConfig {
  /** Minimum log level to output */
  readonly level: LogLevel;
  
  /** Output logs in structured JSON format */
  readonly structured: boolean;
}

/**
 * Metrics plugin configuration.
 * 
 * @requirements 17.1, 17.3, 17.5
 */
export interface MetricsPluginConfig {
  /** Path to SQLite database file */
  readonly dbPath: string;
  
  /** Threshold for flagging slow locators (milliseconds) */
  readonly slowLocatorThresholdMs: number;
  
  /** Threshold for performance regression detection (0-1) */
  readonly performanceRegressionThreshold: number;
}

/**
 * Allure reporting plugin configuration.
 * 
 * @requirements 11.1, 11.2
 */
export interface AllurePluginConfig {
  /** Output directory for Allure results */
  readonly outputDir: string;
  
  /** Capture screenshot on test failure */
  readonly screenshotOnFailure: boolean;
}

/**
 * Zephyr integration plugin configuration.
 * 
 * @requirements 12.1, 12.5
 */
export interface ZephyrPluginConfig {
  /** Zephyr project key */
  readonly projectKey: string;
  
  /** Optional test cycle ID */
  readonly cycleId?: string;
  
  /** Batch size for API updates */
  readonly batchSize: number;
}

/**
 * Visual testing plugin configuration.
 * 
 * @requirements 17.3
 */
export interface VisualPluginConfig {
  /** Path to baseline images */
  readonly baselinePath: string;
  
  /** Path to diff images */
  readonly diffPath: string;
  
  /** Acceptable difference threshold (0-1) */
  readonly threshold: number;
  
  /** Update baselines when missing */
  readonly updateBaselines: boolean;
}

/**
 * API mock plugin configuration.
 * 
 * @requirements 15.2
 */
export interface ApiMockPluginConfig {
  /** Enable network request interception */
  readonly interceptNetworkRequests: boolean;
}

/**
 * Morpheus plugin configuration (development-time only).
 * 
 * @requirements 19.1
 */
export interface MorpheusPluginConfig {
  /** Morpheus API endpoint */
  readonly endpoint: string;
  
  /** Request timeout (milliseconds) */
  readonly timeout: number;
}

/**
 * Plugin configuration container.
 */
export interface PluginsConfig {
  /** List of enabled plugin names */
  readonly enabled: readonly string[];
  
  /** Metrics plugin configuration */
  readonly metrics?: MetricsPluginConfig;
  
  /** Allure plugin configuration */
  readonly allure?: AllurePluginConfig;
  
  /** Zephyr plugin configuration */
  readonly zephyr?: ZephyrPluginConfig;
  
  /** Visual testing plugin configuration */
  readonly visual?: VisualPluginConfig;
  
  /** API mock plugin configuration */
  readonly apiMock?: ApiMockPluginConfig;
  
  /** Morpheus plugin configuration */
  readonly morpheus?: MorpheusPluginConfig;
}

/**
 * Main framework configuration interface.
 * 
 * @requirements 7.1, 7.4, 7.5, 14.2
 */
export interface FrameworkConfig {
  /** Current execution environment */
  readonly environment: Environment;
  
  /** Base URL for the application under test */
  readonly baseUrl: string;
  
  /** Browser configuration */
  readonly browser: BrowserConfig;
  
  /** Timeout configuration */
  readonly timeouts: TimeoutConfig;
  
  /** Retry configuration */
  readonly retry: RetryConfig;
  
  /** Parallel execution configuration */
  readonly parallel: ParallelConfig;
  
  /** Logging configuration */
  readonly logging: LoggingConfig;
  
  /** Plugin configurations */
  readonly plugins?: PluginsConfig;
}

/**
 * Error thrown when required configuration is missing.
 * 
 * @requirements 7.3
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly missingKeys?: readonly string[]
  ) {
    const details = missingKeys && missingKeys.length > 0
      ? `\nMissing configuration keys: ${missingKeys.join(', ')}`
      : '';
    
    super(`${message}${details}`);
    this.name = 'ConfigurationError';
  }
}
