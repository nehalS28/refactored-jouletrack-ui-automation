/**
 * Configuration type definitions for the UI automation framework.
 * Provides type-safe configuration management with environment support.
 *
 * @module types/config
 * @requirements 7.1, 7.2, 7.4, 7.5, 14.2
 */
/**
 * Error thrown when required configuration is missing.
 *
 * @requirements 7.3
 */
export class ConfigurationError extends Error {
    missingKeys;
    constructor(message, missingKeys) {
        const details = missingKeys && missingKeys.length > 0
            ? `\nMissing configuration keys: ${missingKeys.join(', ')}`
            : '';
        super(`${message}${details}`);
        this.missingKeys = missingKeys;
        this.name = 'ConfigurationError';
    }
}
//# sourceMappingURL=config.types.js.map