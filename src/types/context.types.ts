/**
 * TestContext type definitions for the UI automation framework.
 * Provides worker-scoped context for parallel test execution safety.
 * 
 * @module types/context
 * @requirements 15.2, 14.2
 */

import type { WebDriver } from 'selenium-webdriver';
import type { FrameworkConfig } from './config.types.js';
import type { PluginManager } from './plugin.types.js';

/**
 * Structured logger interface for consistent logging across the framework.
 * 
 * @requirements 10.1, 10.2, 10.3
 */
export interface StructuredLogger {
  /** Log debug level message */
  debug(message: string, data?: Record<string, unknown>): void;
  
  /** Log info level message */
  info(message: string, data?: Record<string, unknown>): void;
  
  /** Log warning level message */
  warn(message: string, data?: Record<string, unknown>): void;
  
  /** Log error level message */
  error(message: string, data?: Record<string, unknown>): void;
  
  /** Set current test ID for correlation */
  setTestId(testId: string): void;
  
  /** Clear current test ID */
  clearTestId(): void;
}

/**
 * Action helper interface for common UI interactions.
 * 
 * @requirements 4.1, 4.2, 4.3
 */
export interface ActionHelper {
  /** Click on an element */
  click(locator: import('./locator.types.js').Locator): Promise<void>;
  
  /** Type text into an element */
  type(locator: import('./locator.types.js').Locator, text: string): Promise<void>;
  
  /** Select option from dropdown */
  select(locator: import('./locator.types.js').Locator, value: string): Promise<void>;
  
  /** Hover over an element */
  hover(locator: import('./locator.types.js').Locator): Promise<void>;
  
  /** Drag element to target */
  dragDrop(source: import('./locator.types.js').Locator, target: import('./locator.types.js').Locator): Promise<void>;
  
  /** Scroll element into view */
  scrollIntoView(locator: import('./locator.types.js').Locator): Promise<void>;
  
  /** Clear element content */
  clear(locator: import('./locator.types.js').Locator): Promise<void>;
  
  /** Get element text */
  getText(locator: import('./locator.types.js').Locator): Promise<string>;
  
  /** Get element attribute */
  getAttribute(locator: import('./locator.types.js').Locator, attribute: string): Promise<string | null>;
  
  /** Check if element is displayed */
  isDisplayed(locator: import('./locator.types.js').Locator): Promise<boolean>;
  
  /** Check if element is enabled */
  isEnabled(locator: import('./locator.types.js').Locator): Promise<boolean>;
}

/**
 * Wait strategy interface for element synchronization.
 * 
 * @requirements 5.1, 5.2, 5.4
 */
export interface WaitStrategy {
  /** Wait for element to be visible */
  forVisible(locator: import('./locator.types.js').Locator, timeout?: number): Promise<import('selenium-webdriver').WebElement>;
  
  /** Wait for element to be clickable */
  forClickable(locator: import('./locator.types.js').Locator, timeout?: number): Promise<import('selenium-webdriver').WebElement>;
  
  /** Wait for element to be present in DOM */
  forPresent(locator: import('./locator.types.js').Locator, timeout?: number): Promise<import('selenium-webdriver').WebElement>;
  
  /** Wait for element to become stale */
  forStale(element: import('selenium-webdriver').WebElement, timeout?: number): Promise<void>;
  
  /** Wait for network to be idle */
  forNetworkIdle(timeout?: number): Promise<void>;
  
  /** Wait for element to contain specific text */
  forText(locator: import('./locator.types.js').Locator, expectedText: string, timeout?: number): Promise<import('selenium-webdriver').WebElement>;
  
  /** Wait for specific number of elements */
  forCount(locator: import('./locator.types.js').Locator, expectedCount: number, timeout?: number): Promise<import('selenium-webdriver').WebElement[]>;
  
  /** Wait for API response matching pattern */
  forApiResponse(urlPattern: string | RegExp, timeout?: number): Promise<unknown>;
  
  /** Wait for CSS animations to complete */
  forAnimationComplete(locator: import('./locator.types.js').Locator, timeout?: number): Promise<import('selenium-webdriver').WebElement>;
  
  /** Wait for custom condition */
  forCustom<T>(condition: () => Promise<T | false>, description: string, timeout?: number): Promise<T>;
}

/**
 * Worker-scoped TestContext interface.
 * Each parallel worker gets its own isolated context instance.
 * 
 * @requirements 15.2, 14.2
 */
export interface TestContext {
  /** Unique context identifier */
  readonly id: string;
  
  /** Worker identifier for parallel execution */
  readonly workerId: string;
  
  /** WebDriver instance for browser control */
  readonly driver: WebDriver;
  
  /** Frozen framework configuration */
  readonly config: Readonly<FrameworkConfig>;
  
  /** Structured logger with correlation IDs */
  readonly logger: StructuredLogger;
  
  /** Action helper for UI interactions */
  readonly actions: ActionHelper;
  
  /** Wait strategy for synchronization */
  readonly wait: WaitStrategy;
  
  /** Generated typed locators */
  readonly locators: unknown; // Will be typed when locators are generated
  
  /** Plugin manager for extensions */
  readonly plugins: PluginManager;
  
  /** Correlation ID for tracing */
  readonly correlationId: string;
}

/**
 * TestContext factory interface for creating worker-scoped contexts.
 */
export interface TestContextFactory {
  /** Create a new TestContext for a worker */
  create(workerId: string): Promise<TestContext>;
  
  /** Dispose a TestContext and clean up resources */
  dispose(context: TestContext): Promise<void>;
}
