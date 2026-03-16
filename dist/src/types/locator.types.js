/**
 * Locator type definitions for the UI automation framework.
 * Provides type-safe locator management with multiple strategy support.
 *
 * @module types/locator
 * @requirements 1.1, 1.3, 1.4, 14.2
 */
/**
 * Error thrown when a locator is not found in the registry.
 *
 * @requirements 1.5
 */
export class LocatorNotFoundError extends Error {
    locatorKey;
    availableKeys;
    constructor(locatorKey, availableKeys) {
        const suggestions = availableKeys.length > 0
            ? `\nAvailable locators: ${availableKeys.slice(0, 5).join(', ')}${availableKeys.length > 5 ? '...' : ''}`
            : '\nNo locators available in registry.';
        super(`Locator not found: "${locatorKey}"${suggestions}`);
        this.locatorKey = locatorKey;
        this.availableKeys = availableKeys;
        this.name = 'LocatorNotFoundError';
    }
}
//# sourceMappingURL=locator.types.js.map