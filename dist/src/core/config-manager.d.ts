/**
 * Configuration Manager for the UI automation framework.
 * Loads configuration from JSON files and environment variables with validation.
 *
 * @module core/config-manager
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
import type { FrameworkConfig, Environment } from '../types/config.types.js';
/**
 * ConfigManager handles loading, validating, and providing access to framework configuration.
 *
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export declare class ConfigManager {
    private config;
    private readonly configDir;
    /**
     * Create a new ConfigManager instance.
     *
     * @param configDir - Directory containing config profile files (default: config/profiles)
     */
    constructor(configDir?: string);
    /**
     * Load configuration for the specified environment.
     * Resolves environment variables and validates all required fields.
     *
     * @param environment - The environment profile to load (local, ci, staging, production)
     * @returns The loaded and validated configuration
     * @throws ConfigurationError if config file not found or validation fails
     * @requirements 7.1, 7.2, 7.3, 7.4
     */
    load(environment: Environment): FrameworkConfig;
    /**
     * Get the currently loaded configuration.
     *
     * @returns The loaded configuration
     * @throws ConfigurationError if no configuration has been loaded
     * @requirements 7.5
     */
    getConfig(): FrameworkConfig;
    /**
     * Get the path to the configuration file for an environment.
     *
     * @param environment - The environment name
     * @returns The full path to the config file
     */
    private getConfigPath;
    /**
     * Recursively resolve environment variable references in configuration values.
     * Supports ${VAR_NAME} syntax.
     *
     * @param value - The value to resolve
     * @returns The value with environment variables resolved
     * @throws ConfigurationError if a required environment variable is missing
     * @requirements 7.1
     */
    private resolveEnvironmentVariables;
    /**
     * Resolve environment variable references in a string value.
     *
     * @param value - The string value to resolve
     * @returns The resolved string
     * @throws ConfigurationError if a required environment variable is missing
     */
    private resolveStringValue;
    /**
     * Validate the configuration object has all required fields.
     *
     * @param config - The configuration to validate
     * @throws ConfigurationError if validation fails
     * @requirements 7.2, 7.3
     */
    private validateConfig;
    /**
     * Validate the environment value.
     *
     * @param environment - The environment value to validate
     * @throws ConfigurationError if invalid
     */
    private validateEnvironment;
    /**
     * Validate browser configuration.
     *
     * @param browser - The browser config to validate
     * @throws ConfigurationError if invalid
     */
    private validateBrowserConfig;
    /**
     * Validate timeout configuration.
     *
     * @param timeouts - The timeout config to validate
     * @throws ConfigurationError if invalid
     */
    private validateTimeoutConfig;
    /**
     * Validate retry configuration.
     *
     * @param retry - The retry config to validate
     * @throws ConfigurationError if invalid
     */
    private validateRetryConfig;
    /**
     * Validate parallel configuration.
     *
     * @param parallel - The parallel config to validate
     * @throws ConfigurationError if invalid
     */
    private validateParallelConfig;
    /**
     * Validate logging configuration.
     *
     * @param logging - The logging config to validate
     * @throws ConfigurationError if invalid
     */
    private validateLoggingConfig;
    /**
     * Validate a nested configuration object has all required keys.
     *
     * @param name - The name of the config section
     * @param obj - The object to validate
     * @param requiredKeys - The required keys
     * @throws ConfigurationError if validation fails
     */
    private validateNestedObject;
    /**
     * Log the loaded configuration, masking sensitive values.
     *
     * @param environment - The environment that was loaded
     * @requirements 7.6
     */
    private logLoadedConfig;
    /**
     * Sanitize configuration for logging by masking sensitive values.
     *
     * @param config - The configuration to sanitize
     * @returns The sanitized configuration
     */
    private sanitizeForLogging;
    /**
     * Check if a key is considered sensitive.
     *
     * @param key - The key to check
     * @returns true if the key is sensitive
     */
    private isSensitiveKey;
}
/**
 * Load configuration from environment variable or default to 'local'.
 * Convenience function for quick configuration loading.
 *
 * @param configDir - Optional custom config directory
 * @returns The loaded configuration
 * @throws ConfigurationError if loading fails
 */
export declare function loadConfig(configDir?: string): FrameworkConfig;
/**
 * Create a ConfigManager instance with default settings.
 *
 * @param configDir - Optional custom config directory
 * @returns A new ConfigManager instance
 */
export declare function createConfigManager(configDir?: string): ConfigManager;
//# sourceMappingURL=config-manager.d.ts.map