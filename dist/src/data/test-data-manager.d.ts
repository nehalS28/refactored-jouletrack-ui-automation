/**
 * Test Data Manager for centralized test data management.
 * Supports environment variable resolution, sensitive data masking, and environment-specific data.
 *
 * @module data/test-data-manager
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
import type { Environment } from '../types/config.types.js';
import type { StructuredLogger } from '../types/context.types.js';
/**
 * Test data entry with metadata.
 */
export interface TestDataEntry {
    /** The actual test data value */
    readonly value: unknown;
    /** Whether this data contains sensitive information */
    readonly sensitive?: boolean;
    /** Environments where this data is available */
    readonly environment?: readonly Environment[];
}
/**
 * Test data registry organized by domain.
 */
export interface TestDataRegistry {
    readonly [domain: string]: {
        readonly [key: string]: TestDataEntry;
    };
}
/**
 * Test Data Manager for centralized test data management.
 *
 * Features:
 * - Load test data from YAML files organized by domain
 * - Support environment-specific data overrides
 * - Resolve environment variable references (${VAR})
 * - Mask sensitive data in logs
 * - Throw descriptive errors for missing data
 *
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export declare class TestDataManager {
    private registry;
    private readonly environment;
    private readonly logger;
    private readonly fixturesPath;
    constructor(environment: Environment, logger: StructuredLogger, fixturesPath?: string);
    /**
     * Get test data by domain and key.
     *
     * @param domain - The domain name (e.g., 'authentication', 'shared')
     * @param key - The data key within the domain
     * @returns The resolved test data value
     * @throws {TestDataNotFoundError} If domain or key doesn't exist
     * @throws {ConfigurationError} If required environment variable is missing
     * @requirements 6.3, 6.6
     */
    get<T>(domain: string, key: string): T;
    /**
     * Generate a unique value (timestamp or UUID).
     *
     * @param type - The type of unique value to generate ('timestamp' or 'uuid')
     * @returns The generated unique value
     * @requirements 6.4
     */
    generateUnique(type: 'timestamp' | 'uuid'): string;
    /**
     * Load test data from YAML files in the fixtures directory.
     *
     * @returns The loaded test data registry
     * @requirements 6.1
     */
    private loadTestData;
    /**
     * Recursively resolve environment variable references in a value.
     * Supports ${VAR} syntax in strings, objects, and arrays.
     *
     * @param value - The value to resolve
     * @returns The value with environment variables resolved
     * @throws {ConfigurationError} If a required environment variable is missing
     * @requirements 6.2
     */
    private resolveEnvVars;
}
//# sourceMappingURL=test-data-manager.d.ts.map