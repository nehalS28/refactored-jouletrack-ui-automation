/**
 * Morpheus plugin for development-time validation only.
 * Does NOT run during test execution - only via CLI commands.
 *
 * @module plugins/morpheus/morpheus-plugin
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8
 */
import type { Plugin, PluginConfig, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';
/**
 * Configuration for the Morpheus plugin.
 */
export interface MorpheusPluginConfig extends PluginConfig {
    /** Morpheus MCP endpoint URL */
    readonly endpoint: string;
    /** Request timeout in milliseconds */
    readonly timeout: number;
}
/**
 * Match result from Morpheus query.
 */
export interface MorpheusMatch {
    type: string;
    path: string;
    content: string;
    similarity: number;
}
/**
 * Query log entry for audit purposes.
 */
export interface MorpheusQueryLog {
    timestamp: Date;
    type: string;
    query: string;
    found: boolean;
    matchCount: number;
}
/**
 * Validation result for a selector.
 */
export interface ValidationResult {
    selector: string;
    valid: boolean;
    suggestions?: string[];
    existingMatches?: MorpheusMatch[];
    error?: string;
}
/**
 * Morpheus plugin for development-time validation only.
 * Does NOT run during test execution - only via CLI commands.
 *
 * Key features:
 * - Validates selectors against JouleTrack frontend codebase
 * - Finds similar step patterns to prevent duplicates
 * - Fetches CSS selectors from components
 * - Maintains query log for audit purposes
 * - No-op lifecycle methods (development-time only)
 *
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8
 */
export declare class MorpheusPlugin implements Plugin {
    readonly name = "morpheus";
    readonly version = "1.0.0";
    private readonly config;
    private readonly logger;
    private queryLog;
    constructor(config: MorpheusPluginConfig, logger: StructuredLogger);
    /**
     * Initialize the plugin.
     * Morpheus is only used via CLI, not during test execution.
     */
    initialize(): Promise<void>;
    /**
     * Validate selectors against JouleTrack frontend codebase.
     * Called via: cli validate:selectors
     *
     * @param selectors - Array of CSS selectors to validate
     * @returns Validation results for each selector
     * @requirements 19.1, 19.2, 19.3, 19.4
     */
    validateSelectors(selectors: string[]): Promise<ValidationResult[]>;
    /**
     * Find existing step patterns similar to a new pattern.
     * Called via: cli validate:steps
     *
     * @param pattern - Step pattern to search for
     * @returns Array of similar step matches
     * @requirements 19.3
     */
    findSimilarSteps(pattern: string): Promise<MorpheusMatch[]>;
    /**
     * Fetch CSS selector from JouleTrack frontend for a component.
     *
     * @param componentPath - Path to component file
     * @returns CSS selector or null if not found
     * @requirements 19.4
     */
    fetchSelector(componentPath: string): Promise<string | null>;
    /**
     * Get the query log for audit purposes.
     *
     * @returns Copy of the query log
     * @requirements 19.6
     */
    getQueryLog(): MorpheusQueryLog[];
    /**
     * Query Morpheus MCP for information.
     *
     * @param type - Query type (selector, step, component)
     * @param query - Query string
     * @returns Query result
     */
    private queryMorpheus;
    /**
     * Log a query for audit purposes.
     *
     * @param type - Query type
     * @param query - Query string
     * @param result - Query result
     */
    private logQuery;
    /**
     * No-op: Morpheus does not run during test execution.
     */
    onTestStart(_testId: string, _testName: string): Promise<void>;
    /**
     * No-op: Morpheus does not run during test execution.
     */
    onTestEnd(_testId: string, _status: TestStatus, _duration: number): Promise<void>;
    /**
     * No-op: Morpheus does not run during test execution.
     */
    onStepExecuted(_step: StepInfo): Promise<void>;
    /**
     * No-op: Morpheus does not run during test execution.
     */
    onError(_error: Error, _context: ErrorContext): Promise<void>;
    /**
     * No-op: Morpheus does not run during test execution.
     */
    flush(): Promise<void>;
    /**
     * No-op: Morpheus does not run during test execution.
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=morpheus-plugin.d.ts.map