/**
 * Lightweight WebDriver service for browser lifecycle management.
 * Single responsibility: browser initialization, session management, and cleanup.
 * @module core/webdriver-service
 * @requirements 3.1, 3.2, 3.4, 3.6
 */
import { WebDriver } from 'selenium-webdriver';
import type { FrameworkConfig, BrowserName } from '../types/config.types.js';
import type { StructuredLogger } from '../types/context.types.js';
/** Error thrown when browser initialization fails after all retry attempts. */
export declare class BrowserInitializationError extends Error {
    readonly browserName: BrowserName;
    readonly attempts: number;
    readonly lastError?: Error | undefined;
    constructor(message: string, browserName: BrowserName, attempts: number, lastError?: Error | undefined);
}
/** Lightweight WebDriver service with single responsibility for browser lifecycle. */
export declare class WebDriverService {
    private readonly config;
    private readonly logger;
    private driver;
    constructor(config: FrameworkConfig, logger: StructuredLogger);
    /** Initialize WebDriver with retry logic and exponential backoff. */
    initialize(): Promise<WebDriver>;
    getDriver(): WebDriver | null;
    quit(): Promise<void>;
    private createDriver;
    private logSessionDetails;
}
//# sourceMappingURL=webdriver-service.d.ts.map