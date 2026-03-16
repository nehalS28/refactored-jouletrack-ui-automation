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
export declare class ApiMockPlugin implements Plugin {
    readonly name = "api-mock";
    readonly version = "1.0.0";
    private readonly config;
    private readonly logger;
    private mocks;
    constructor(config: Partial<ApiMockPluginConfig> | undefined, logger: StructuredLogger);
    /**
     * Initialize the plugin.
     */
    initialize(): Promise<void>;
    /**
     * Register a mock endpoint.
     *
     * @param definition - Mock definition with URL pattern, method, response, and delay
     */
    mockEndpoint(definition: MockDefinition): void;
    /**
     * Get a mock response for a URL and method.
     *
     * @param url - URL to match
     * @param method - HTTP method
     * @returns Mock response or null if no match
     */
    getMock(url: string, method: string): MockResponse | null;
    /**
     * Get a mock response with delay information.
     *
     * @param url - URL to match
     * @param method - HTTP method
     * @returns Mock response with delay or null if no match
     */
    getMockWithDelay(url: string, method: string): MockWithDelay | null;
    /**
     * Clear all registered mocks.
     */
    clearMocks(): void;
    /**
     * Get the number of registered mocks.
     *
     * @returns Number of registered mocks
     */
    getMockCount(): number;
    /**
     * Called when a test starts.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name
     */
    onTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Called when a test ends.
     * Clears all mocks for test isolation.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Called after each step is executed.
     * API Mock plugin doesn't need to track step execution.
     *
     * @param _step - Step execution information
     */
    onStepExecuted(_step: StepInfo): Promise<void>;
    /**
     * Called when an error occurs.
     * API Mock plugin doesn't need to handle errors.
     *
     * @param _error - The error that occurred
     * @param _context - Error context information
     */
    onError(_error: Error, _context: ErrorContext): Promise<void>;
    /**
     * Flush any buffered data.
     */
    flush(): Promise<void>;
    /**
     * Dispose the plugin and clean up resources.
     */
    dispose(): Promise<void>;
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
    private compilePattern;
}
//# sourceMappingURL=api-mock-plugin.d.ts.map