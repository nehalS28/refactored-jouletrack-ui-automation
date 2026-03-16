/**
 * Configuration Manager for the UI automation framework.
 * Loads configuration from JSON files and environment variables with validation.
 *
 * @module core/config-manager
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { ConfigurationError } from '../types/config.types.js';
/**
 * Pattern for environment variable references in config values.
 * Matches ${VAR_NAME} syntax.
 */
const ENV_VAR_PATTERN = /\$\{([^}]+)\}/g;
/**
 * Required top-level configuration keys that must be present.
 */
const REQUIRED_CONFIG_KEYS = [
    'environment',
    'baseUrl',
    'browser',
    'timeouts',
    'retry',
    'parallel',
    'logging',
];
/**
 * Required browser configuration keys.
 */
const REQUIRED_BROWSER_KEYS = [
    'name',
    'headless',
    'windowSize',
    'args',
];
/**
 * Required timeout configuration keys.
 */
const REQUIRED_TIMEOUT_KEYS = [
    'implicit',
    'explicit',
    'pageLoad',
    'script',
    'polling',
];
/**
 * Required retry configuration keys.
 */
const REQUIRED_RETRY_KEYS = [
    'maxAttempts',
    'backoffMs',
    'backoffMultiplier',
];
/**
 * Required parallel configuration keys.
 */
const REQUIRED_PARALLEL_KEYS = [
    'enabled',
    'workers',
];
/**
 * Required logging configuration keys.
 */
const REQUIRED_LOGGING_KEYS = [
    'level',
    'structured',
];
/**
 * Valid environment values.
 */
const VALID_ENVIRONMENTS = ['local', 'ci', 'staging', 'production'];
/**
 * Valid log levels.
 */
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
/**
 * Sensitive configuration keys that should not be logged.
 */
const SENSITIVE_KEYS = [
    'password',
    'token',
    'apiKey',
    'secret',
    'auth',
    'credential',
];
/**
 * ConfigManager handles loading, validating, and providing access to framework configuration.
 *
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export class ConfigManager {
    config = null;
    configDir;
    /**
     * Create a new ConfigManager instance.
     *
     * @param configDir - Directory containing config profile files (default: config/profiles)
     */
    constructor(configDir) {
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
    load(environment) {
        const configPath = this.getConfigPath(environment);
        if (!existsSync(configPath)) {
            throw new ConfigurationError(`Configuration file not found for environment '${environment}': ${configPath}`);
        }
        let rawConfig;
        try {
            const fileContent = readFileSync(configPath, 'utf-8');
            rawConfig = JSON.parse(fileContent);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new ConfigurationError(`Failed to parse configuration file for environment '${environment}': ${message}`);
        }
        // Resolve environment variables in the config
        const resolvedConfig = this.resolveEnvironmentVariables(rawConfig);
        // Validate the configuration
        this.validateConfig(resolvedConfig);
        this.config = resolvedConfig;
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
    getConfig() {
        if (!this.config) {
            throw new ConfigurationError('Configuration not loaded. Call load() first with an environment.');
        }
        return this.config;
    }
    /**
     * Get the path to the configuration file for an environment.
     *
     * @param environment - The environment name
     * @returns The full path to the config file
     */
    getConfigPath(environment) {
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
    resolveEnvironmentVariables(value) {
        if (typeof value === 'string') {
            return this.resolveStringValue(value);
        }
        if (Array.isArray(value)) {
            return value.map(item => this.resolveEnvironmentVariables(item));
        }
        if (value !== null && typeof value === 'object') {
            const resolved = {};
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
    resolveStringValue(value) {
        return value.replace(ENV_VAR_PATTERN, (_, varName) => {
            const envValue = process.env[varName];
            if (envValue === undefined) {
                throw new ConfigurationError(`Required environment variable '${varName}' is not set`, [varName]);
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
    validateConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new ConfigurationError('Configuration must be a non-null object');
        }
        const configObj = config;
        const missingKeys = [];
        // Check top-level required keys
        for (const key of REQUIRED_CONFIG_KEYS) {
            if (!(key in configObj)) {
                missingKeys.push(key);
            }
        }
        if (missingKeys.length > 0) {
            throw new ConfigurationError('Missing required configuration keys', missingKeys);
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
    validateEnvironment(environment) {
        if (!VALID_ENVIRONMENTS.includes(environment)) {
            throw new ConfigurationError(`Invalid environment '${environment}'. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
        }
    }
    /**
     * Validate browser configuration.
     *
     * @param browser - The browser config to validate
     * @throws ConfigurationError if invalid
     */
    validateBrowserConfig(browser) {
        this.validateNestedObject('browser', browser, REQUIRED_BROWSER_KEYS);
        const browserObj = browser;
        // Validate browser name
        const validBrowsers = ['chrome', 'firefox', 'edge', 'safari'];
        if (!validBrowsers.includes(browserObj['name'])) {
            throw new ConfigurationError(`Invalid browser name '${browserObj['name']}'. Must be one of: ${validBrowsers.join(', ')}`);
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
        const ws = windowSize;
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
    validateTimeoutConfig(timeouts) {
        this.validateNestedObject('timeouts', timeouts, REQUIRED_TIMEOUT_KEYS);
        const timeoutsObj = timeouts;
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
    validateRetryConfig(retry) {
        this.validateNestedObject('retry', retry, REQUIRED_RETRY_KEYS);
        const retryObj = retry;
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
    validateParallelConfig(parallel) {
        this.validateNestedObject('parallel', parallel, REQUIRED_PARALLEL_KEYS);
        const parallelObj = parallel;
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
    validateLoggingConfig(logging) {
        this.validateNestedObject('logging', logging, REQUIRED_LOGGING_KEYS);
        const loggingObj = logging;
        if (!VALID_LOG_LEVELS.includes(loggingObj['level'])) {
            throw new ConfigurationError(`Invalid log level '${loggingObj['level']}'. Must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
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
    validateNestedObject(name, obj, requiredKeys) {
        if (!obj || typeof obj !== 'object') {
            throw new ConfigurationError(`${name} must be a non-null object`);
        }
        const objRecord = obj;
        const missingKeys = [];
        for (const key of requiredKeys) {
            if (!(key in objRecord)) {
                missingKeys.push(`${name}.${key}`);
            }
        }
        if (missingKeys.length > 0) {
            throw new ConfigurationError(`Missing required configuration keys in ${name}`, missingKeys);
        }
    }
    /**
     * Log the loaded configuration, masking sensitive values.
     *
     * @param environment - The environment that was loaded
     * @requirements 7.6
     */
    logLoadedConfig(environment) {
        if (!this.config)
            return;
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
    sanitizeForLogging(config) {
        if (typeof config === 'string') {
            return config;
        }
        if (Array.isArray(config)) {
            return config.map(item => this.sanitizeForLogging(item));
        }
        if (config !== null && typeof config === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(config)) {
                if (this.isSensitiveKey(key)) {
                    sanitized[key] = '[REDACTED]';
                }
                else {
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
    isSensitiveKey(key) {
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
export function loadConfig(configDir) {
    const environment = (process.env['UI_AUTOMATION_ENV'] ?? 'local');
    const manager = new ConfigManager(configDir);
    return manager.load(environment);
}
/**
 * Create a ConfigManager instance with default settings.
 *
 * @param configDir - Optional custom config directory
 * @returns A new ConfigManager instance
 */
export function createConfigManager(configDir) {
    return new ConfigManager(configDir);
}
//# sourceMappingURL=config-manager.js.map