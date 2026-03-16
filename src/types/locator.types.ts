/**
 * Locator type definitions for the UI automation framework.
 * Provides type-safe locator management with multiple strategy support.
 * 
 * @module types/locator
 * @requirements 1.1, 1.3, 1.4, 14.2
 */

/**
 * Supported locator strategies.
 * CSS selectors are the preferred strategy.
 */
export type LocatorStrategy = 'css' | 'data-testid' | 'xpath' | 'aria-label';

/**
 * Locator interface representing a UI element locator.
 * 
 * @requirements 1.1, 1.3
 */
export interface Locator {
  /** The selector string used to locate the element */
  readonly selector: string;
  
  /** The strategy used to interpret the selector */
  readonly strategy: LocatorStrategy;
  
  /** Human-readable description of the element */
  readonly description: string;
  
  /** Optional custom timeout for this specific locator (in milliseconds) */
  readonly timeout?: number;
}

/**
 * Locator registry entry with metadata.
 */
export interface LocatorEntry extends Locator {
  /** Unique key for the locator within its domain */
  readonly key: string;
  
  /** Domain/page this locator belongs to */
  readonly domain: string;
  
  /** Component within the domain */
  readonly component: string;
}

/**
 * YAML locator definition structure.
 * Used for parsing locator registry YAML files.
 */
export interface YamlLocatorDefinition {
  selector: string;
  strategy: LocatorStrategy;
  description: string;
  timeout?: number;
}

/**
 * YAML component structure containing multiple locators.
 */
export interface YamlComponentDefinition {
  [elementName: string]: YamlLocatorDefinition;
}

/**
 * YAML page structure containing multiple components.
 */
export interface YamlPageDefinition {
  [componentName: string]: YamlComponentDefinition;
}

/**
 * Root YAML registry structure.
 */
export interface YamlRegistryDefinition {
  [pageName: string]: YamlPageDefinition;
}

/**
 * Error thrown when a locator is not found in the registry.
 * 
 * @requirements 1.5
 */
export class LocatorNotFoundError extends Error {
  constructor(
    public readonly locatorKey: string,
    public readonly availableKeys: string[]
  ) {
    const suggestions = availableKeys.length > 0
      ? `\nAvailable locators: ${availableKeys.slice(0, 5).join(', ')}${availableKeys.length > 5 ? '...' : ''}`
      : '\nNo locators available in registry.';
    
    super(`Locator not found: "${locatorKey}"${suggestions}`);
    this.name = 'LocatorNotFoundError';
  }
}
