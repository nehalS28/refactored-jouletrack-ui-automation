/**
 * Morpheus plugin for development-time validation only.
 * Does NOT run during test execution - only via CLI commands.
 *
 * @module plugins/morpheus/morpheus-plugin
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8
 */
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
export class MorpheusPlugin {
    name = 'morpheus';
    version = '1.0.0';
    config;
    logger;
    queryLog = [];
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    /**
     * Initialize the plugin.
     * Morpheus is only used via CLI, not during test execution.
     */
    async initialize() {
        this.logger.debug('Morpheus plugin initialized (development-time only)');
    }
    /**
     * Validate selectors against JouleTrack frontend codebase.
     * Called via: cli validate:selectors
     *
     * @param selectors - Array of CSS selectors to validate
     * @returns Validation results for each selector
     * @requirements 19.1, 19.2, 19.3, 19.4
     */
    async validateSelectors(selectors) {
        const results = [];
        for (const selector of selectors) {
            try {
                const result = await this.queryMorpheus('selector', selector);
                results.push({
                    selector,
                    valid: result.found,
                    suggestions: result.suggestions || [],
                    existingMatches: result.matches || [],
                });
                this.logQuery('selector', selector, result);
            }
            catch (error) {
                results.push({
                    selector,
                    valid: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return results;
    }
    /**
     * Find existing step patterns similar to a new pattern.
     * Called via: cli validate:steps
     *
     * @param pattern - Step pattern to search for
     * @returns Array of similar step matches
     * @requirements 19.3
     */
    async findSimilarSteps(pattern) {
        const result = await this.queryMorpheus('step', pattern);
        this.logQuery('step', pattern, result);
        return result.matches || [];
    }
    /**
     * Fetch CSS selector from JouleTrack frontend for a component.
     *
     * @param componentPath - Path to component file
     * @returns CSS selector or null if not found
     * @requirements 19.4
     */
    async fetchSelector(componentPath) {
        const result = await this.queryMorpheus('component', componentPath);
        this.logQuery('component', componentPath, result);
        if (result.found && result.matches && result.matches.length > 0) {
            const firstMatch = result.matches[0];
            if (firstMatch) {
                return firstMatch.content;
            }
        }
        return null;
    }
    /**
     * Get the query log for audit purposes.
     *
     * @returns Copy of the query log
     * @requirements 19.6
     */
    getQueryLog() {
        return [...this.queryLog];
    }
    /**
     * Query Morpheus MCP for information.
     *
     * @param type - Query type (selector, step, component)
     * @param query - Query string
     * @returns Query result
     */
    async queryMorpheus(type, query) {
        const response = await fetch(`${this.config.endpoint}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, query }),
            signal: AbortSignal.timeout(this.config.timeout),
        });
        if (!response.ok) {
            throw new Error(`Morpheus query failed: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * Log a query for audit purposes.
     *
     * @param type - Query type
     * @param query - Query string
     * @param result - Query result
     */
    logQuery(type, query, result) {
        this.queryLog.push({
            timestamp: new Date(),
            type,
            query,
            found: result.found,
            matchCount: result.matches?.length || 0,
        });
    }
    // Plugin lifecycle methods (no-op for development-time plugin)
    // These methods do nothing because Morpheus only runs via CLI commands
    /**
     * No-op: Morpheus does not run during test execution.
     */
    async onTestStart(_testId, _testName) {
        // No-op: development-time only
    }
    /**
     * No-op: Morpheus does not run during test execution.
     */
    async onTestEnd(_testId, _status, _duration) {
        // No-op: development-time only
    }
    /**
     * No-op: Morpheus does not run during test execution.
     */
    async onStepExecuted(_step) {
        // No-op: development-time only
    }
    /**
     * No-op: Morpheus does not run during test execution.
     */
    async onError(_error, _context) {
        // No-op: development-time only
    }
    /**
     * No-op: Morpheus does not run during test execution.
     */
    async flush() {
        // No-op: development-time only
    }
    /**
     * No-op: Morpheus does not run during test execution.
     */
    async dispose() {
        // No-op: development-time only
    }
}
//# sourceMappingURL=morpheus-plugin.js.map