/**
 * Configuration Manager for the UI automation framework.
 * Loads configuration from JSON files and environment variables with validation.
 * 
 * @module core/config-manager
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import type { FrameworkConfig, Environment, LogLevel } from '../types/config.types.js';
import { ConfigurationError } from '../types/config.types.js';

/**
 * Pattern for environment variable references in config values.
 * Matches ${VAR_NAME} syntax.
 */
const ENV_VAR_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Required top-level configuration keys that must be present.
 */
const REQUIRED_CONFIG_KEYS: readonly string[] = [
  'environment',
  'baseUrl',
  'browser',
  'timeouts',
  'retry',
  'parallel',
  'logging',
] as const;

/**
 * Required browser configuration keys.
 */
const REQUIRED_BROWSER_KEYS: readonly string[] = [
  'name',
  'headless',
  'windowSize',
  'args',
] as const;

/**
 * Required timeout configuration keys.
 */
const REQUIRED_TIMEOUT_KEYS: readonly string[] = [
  'implicit',
  'explicit',
  'pageLoad',
  'script',
  'polling',
] as const;

/**
 * Required retry configuration keys.
 */
const REQUIRED_RETRY_KEYS: readonly string[] = [
  'maxAttempts',
  'backoffMs',
  'backoffMultiplier',
] as const;

/**
 * Required parallel configuration keys.
 */
const REQUIRED_PARALLEL_KEYS: readonly string[] = [
  'enabled',
  'workers',
] as const;

/**
 * Required logging configuration keys.
 */
const REQUIRED_LOGGING_KEYS: readonly string[] = [
  'level',
  'structured',
] as const;

/**
 * Valid environment values.
 */
const VALID_ENVIRONMENTS: readonly Environment[] = ['local', 'ci', 'staging', 'production'] as const;

/**
 * Valid log levels.
 */
const VALID_LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'] as const;

/**
 * Sensitive configuration keys that should not be logged.
 */
const SENSITIVE_KEYS: readonly string[] = [
  'password',
  'token',
  'apiKey',
  'secret',
  'auth',
  'credential',
] as const;

/**
 * ConfigManager handles loading, validating, and providing access to framework configuration.
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export class ConfigManager {
  private config: FrameworkConfig | null = null;
  private readonly configDir: string;

  /**
   * Create a new ConfigManager instance.
   * 
   * @param configDir - Directory containing config profile files (default: config/profiles)
   */
  constructor(configDir?: string) {
    this.configDir = configDir ?? join(process.cwd(), 'config', 'profiles');
  }

  /**
   * Load configuration for the specified environment.
   * Resolves environment variables and validates all required fields.
   * 
   * @param environment - The environment profile to load (local, ci, staging, production)
   * @returns The loaded and validated configuration
   * @throws ConfigurationError if config file not found or validation fails
   * @requirements 7.1, 7.2, 7.3, 7.4
   */
  load(environment: Environment): FrameworkConfig {
    const configPath = this.getConfigPath(environment);
    
    if (!existsSync(configPath)) {
      throw new ConfigurationError(
        `Configuration file not found for environment '${environment}': ${configPath}`
      );
    }

    let rawConfig: unknown;
    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      rawConfig = JSON.parse(fileContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(
        `Failed to parse configuration file for environment '${environment}': ${message}`
      );
    }

    // Resolve environment variables in the config
    const resolvedConfig = this.resolveEnvironmentVariables(rawConfig);

    // Validate the configuration
    this.validateConfig(resolvedConfig);

    this.config = resolvedConfig as FrameworkConfig;
    
    // Log loaded configuration (excluding sensitive values)
    this.logLoadedConfig(environment);

    return this.config;
  }

  /**
   * Get the currently loaded configuration.
   * 
   * @returns The loaded configuration
   * @throws ConfigurationError if no configuration has been loaded
   * @requirements 7.5
   */
  getConfig(): FrameworkConfig {
    if (!this.config) {
      throw new ConfigurationError(
        'Configuration not loaded. Call load() first with an environment.'
      );
    }
    return this.config;
  }

  /**
   * Get the path to the configuration file for an environment.
   * 
   * @param environment - The environment name
   * @returns The full path to the config file
   */
  private getConfigPath(environment: Environment): string {
    return resolve(this.configDir, `${environment}.json`);
  }

  /**
   * Recursively resolve environment variable references in configuration values.
   * Supports ${VAR_NAME} syntax.
   * 
   * @param value - The value to resolve
   * @returns The value with environment variables resolved
   * @throws ConfigurationError if a required environment variable is missing
   * @requirements 7.1
   */
  private resolveEnvironmentVariables(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.resolveStringValue(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveEnvironmentVariables(item));
    }

    if (value !== null && typeof value === 'object') {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveEnvironmentVariables(val);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Resolve environment variable references in a string value.
   * 
   * @param value - The string value to resolve
   * @returns The resolved string
   * @throws ConfigurationError if a required environment variable is missing
   */
  private resolveStringValue(value: string): string {
    return value.replace(ENV_VAR_PATTERN, (_, varName: string) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        throw new ConfigurationError(
          `Required environment variable '${varName}' is not set`,
          [varName]
        );
      }
      return envValue;
    });
  }

  /**
   * Validate the configuration object has all required fields.
   * 
   * @param config - The configuration to validate
   * @throws ConfigurationError if validation fails
   * @requirements 7.2, 7.3
   */
  private validateConfig(config: unknown): void {
    if (!config || typeof config !== 'object') {
      throw new ConfigurationError('Configuration must be a non-null object');
    }

    const configObj = config as Record<string, unknown>;
    const missingKeys: string[] = [];

    // Check top-level required keys
    for (const key of REQUIRED_CONFIG_KEYS) {
      if (!(key in configObj)) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      throw new ConfigurationError(
        'Missing required configuration keys',
        missingKeys
      );
    }

    // Validate environment value
    this.validateEnvironment(configObj['environment']);

    // Validate nested objects
    this.validateBrowserConfig(configObj['browser']);
    this.validateTimeoutConfig(configObj['timeouts']);
    this.validateRetryConfig(configObj['retry']);
    this.validateParallelConfig(configObj['parallel']);
    this.validateLoggingConfig(configObj['logging']);

    // Validate baseUrl is a non-empty string
    if (typeof configObj['baseUrl'] !== 'string' || configObj['baseUrl'].trim() === '') {
      throw new ConfigurationError('baseUrl must be a non-empty string');
    }
  }

  /**
   * Validate the environment value.
   * 
   * @param environment - The environment value to validate
   * @throws ConfigurationError if invalid
   */
  private validateEnvironment(environment: unknown): void {
    if (!VALID_ENVIRONMENTS.includes(environment as Environment)) {
      throw new ConfigurationError(
        `Invalid environment '${environment}'. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`
      );
    }
  }

  /**
   * Validate browser configuration.
   * 
   * @param browser - The browser config to validate
   * @throws ConfigurationError if invalid
   */
  private validateBrowserConfig(browser: unknown): void {
    this.validateNestedObject('browser', browser, REQUIRED_BROWSER_KEYS);
    
    const browserObj = browser as Record<string, unknown>;
    
    // Validate browser name
    const validBrowsers = ['chrome', 'firefox', 'edge', 'safari'];
    if (!validBrowsers.includes(browserObj['name'] as string)) {
      throw new ConfigurationError(
        `Invalid browser name '${browserObj['name']}'. Must be one of: ${validBrowsers.join(', ')}`
      );
    }

    // Validate headless is boolean
    if (typeof browserObj['headless'] !== 'boolean') {
      throw new ConfigurationError('browser.headless must be a boolean');
    }

    // Validate windowSize
    const windowSize = browserObj['windowSize'];
    if (!windowSize || typeof windowSize !== 'object') {
      throw new ConfigurationError('browser.windowSize must be an object');
    }
    const ws = windowSize as Record<string, unknown>;
    if (typeof ws['width'] !== 'number' || typeof ws['height'] !== 'number') {
      throw new ConfigurationError('browser.windowSize.width and height must be numbers');
    }

    // Validate args is an array
    if (!Array.isArray(browserObj['args'])) {
      throw new ConfigurationError('browser.args must be an array');
    }
  }

  /**
   * Validate timeout configuration.
   * 
   * @param timeouts - The timeout config to validate
   * @throws ConfigurationError if invalid
   */
  private validateTimeoutConfig(timeouts: unknown): void {
    this.validateNestedObject('timeouts', timeouts, REQUIRED_TIMEOUT_KEYS);
    
    const timeoutsObj = timeouts as Record<string, unknown>;
    for (const key of REQUIRED_TIMEOUT_KEYS) {
      if (typeof timeoutsObj[key] !== 'number' || timeoutsObj[key] < 0) {
        throw new ConfigurationError(`timeouts.${key} must be a non-negative number`);
      }
    }
  }

  /**
   * Validate retry configuration.
   * 
   * @param retry - The retry config to validate
   * @throws ConfigurationError if invalid
   */
  private validateRetryConfig(retry: unknown): void {
    this.validateNestedObject('retry', retry, REQUIRED_RETRY_KEYS);
    
    const retryObj = retry as Record<string, unknown>;
    
    if (typeof retryObj['maxAttempts'] !== 'number' || retryObj['maxAttempts'] < 1) {
      throw new ConfigurationError('retry.maxAttempts must be a positive number');
    }
    if (typeof retryObj['backoffMs'] !== 'number' || retryObj['backoffMs'] < 0) {
      throw new ConfigurationError('retry.backoffMs must be a non-negative number');
    }
    if (typeof retryObj['backoffMultiplier'] !== 'number' || retryObj['backoffMultiplier'] < 1) {
      throw new ConfigurationError('retry.backoffMultiplier must be at least 1');
    }
  }

  /**
   * Validate parallel configuration.
   * 
   * @param parallel - The parallel config to validate
   * @throws ConfigurationError if invalid
   */
  private validateParallelConfig(parallel: unknown): void {
    this.validateNestedObject('parallel', parallel, REQUIRED_PARALLEL_KEYS);
    
    const parallelObj = parallel as Record<string, unknown>;
    
    if (typeof parallelObj['enabled'] !== 'boolean') {
      throw new ConfigurationError('parallel.enabled must be a boolean');
    }
    if (typeof parallelObj['workers'] !== 'number' || parallelObj['workers'] < 1) {
      throw new ConfigurationError('parallel.workers must be a positive number');
    }
  }

  /**
   * Validate logging configuration.
   * 
   * @param logging - The logging config to validate
   * @throws ConfigurationError if invalid
   */
  private validateLoggingConfig(logging: unknown): void {
    this.validateNestedObject('logging', logging, REQUIRED_LOGGING_KEYS);
    
    const loggingObj = logging as Record<string, unknown>;
    
    if (!VALID_LOG_LEVELS.includes(loggingObj['level'] as LogLevel)) {
      throw new ConfigurationError(
        `Invalid log level '${loggingObj['level']}'. Must be one of: ${VALID_LOG_LEVELS.join(', ')}`
      );
    }
    if (typeof loggingObj['structured'] !== 'boolean') {
      throw new ConfigurationError('logging.structured must be a boolean');
    }
  }

  /**
   * Validate a nested configuration object has all required keys.
   * 
   * @param name - The name of the config section
   * @param obj - The object to validate
   * @param requiredKeys - The required keys
   * @throws ConfigurationError if validation fails
   */
  private validateNestedObject(
    name: string,
    obj: unknown,
    requiredKeys: readonly string[]
  ): void {
    if (!obj || typeof obj !== 'object') {
      throw new ConfigurationError(`${name} must be a non-null object`);
    }

    const objRecord = obj as Record<string, unknown>;
    const missingKeys: string[] = [];

    for (const key of requiredKeys) {
      if (!(key in objRecord)) {
        missingKeys.push(`${name}.${key}`);
      }
    }

    if (missingKeys.length > 0) {
      throw new ConfigurationError(
        `Missing required configuration keys in ${name}`,
        missingKeys
      );
    }
  }

  /**
   * Log the loaded configuration, masking sensitive values.
   * 
   * @param environment - The environment that was loaded
   * @requirements 7.6
   */
  private logLoadedConfig(environment: Environment): void {
    if (!this.config) return;

    const sanitizedConfig = this.sanitizeForLogging(this.config);
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Configuration loaded for environment '${environment}'`,
      config: sanitizedConfig,
    }));
  }

  /**
   * Sanitize configuration for logging by masking sensitive values.
   * 
   * @param config - The configuration to sanitize
   * @returns The sanitized configuration
   */
  private sanitizeForLogging(config: unknown): unknown {
    if (typeof config === 'string') {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map(item => this.sanitizeForLogging(item));
    }

    if (config !== null && typeof config === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config)) {
        if (this.isSensitiveKey(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      return sanitized;
    }

    return config;
  }

  /**
   * Check if a key is considered sensitive.
   * 
   * @param key - The key to check
   * @returns true if the key is sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
  }
}

/**
 * Load configuration from environment variable or default to 'local'.
 * Convenience function for quick configuration loading.
 * 
 * @param configDir - Optional custom config directory
 * @returns The loaded configuration
 * @throws ConfigurationError if loading fails
 */
export function loadConfig(configDir?: string): FrameworkConfig {
  const environment = (process.env['UI_AUTOMATION_ENV'] ?? 'local') as Environment;
  const manager = new ConfigManager(configDir);
  return manager.load(environment);
}

/**
 * Create a ConfigManager instance with default settings.
 * 
 * @param configDir - Optional custom config directory
 * @returns A new ConfigManager instance
 */
export function createConfigManager(configDir?: string): ConfigManager {
  return new ConfigManager(configDir);
}
