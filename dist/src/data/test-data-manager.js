/**
 * Test Data Manager for centralized test data management.
 * Supports environment variable resolution, sensitive data masking, and environment-specific data.
 *
 * @module data/test-data-manager
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ConfigurationError, TestDataNotFoundError } from '../utils/errors.js';
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
export class TestDataManager {
    registry;
    environment;
    logger;
    fixturesPath;
    constructor(environment, logger, fixturesPath = path.join(process.cwd(), 'src/data/fixtures')) {
        this.environment = environment;
        this.logger = logger;
        this.fixturesPath = fixturesPath;
        this.registry = this.loadTestData();
    }
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
    get(domain, key) {
        const domainData = this.registry[domain];
        if (!domainData) {
            throw new TestDataNotFoundError(`Domain not found: ${domain}`, {
                domain,
                availableDomains: Object.keys(this.registry)
            });
        }
        const entry = domainData[key];
        if (!entry) {
            throw new TestDataNotFoundError(`Test data not found: ${domain}.${key}`, {
                domain,
                key,
                availableKeys: Object.keys(domainData)
            });
        }
        // Check environment-specific availability
        if (entry.environment && !entry.environment.includes(this.environment)) {
            throw new TestDataNotFoundError(`Test data ${domain}.${key} not available for environment: ${this.environment}`, {
                domain,
                key,
                currentEnvironment: this.environment,
                availableEnvironments: entry.environment
            });
        }
        // Resolve environment variables
        const resolvedValue = this.resolveEnvVars(entry.value);
        // Mask sensitive data in logs
        if (entry.sensitive) {
            this.logger.debug(`Accessing sensitive data: ${domain}.${key}`, { value: '[MASKED]' });
        }
        else {
            this.logger.debug(`Accessing test data: ${domain}.${key}`, { value: resolvedValue });
        }
        return resolvedValue;
    }
    /**
     * Generate a unique value (timestamp or UUID).
     *
     * @param type - The type of unique value to generate ('timestamp' or 'uuid')
     * @returns The generated unique value
     * @requirements 6.4
     */
    generateUnique(type) {
        if (type === 'timestamp') {
            return Date.now().toString();
        }
        else {
            // Simple UUID v4 implementation
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }
    /**
     * Load test data from YAML files in the fixtures directory.
     *
     * @returns The loaded test data registry
     * @requirements 6.1
     */
    loadTestData() {
        const registry = {};
        try {
            const files = fs.readdirSync(this.fixturesPath);
            for (const file of files) {
                if (file.endsWith('.yaml') || file.endsWith('.yml')) {
                    const domain = path.basename(file, path.extname(file));
                    const filePath = path.join(this.fixturesPath, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const data = yaml.parse(content);
                    registry[domain] = data;
                    this.logger.debug(`Loaded test data for domain: ${domain}`, { file });
                }
            }
            this.logger.info('Test data loaded', {
                domains: Object.keys(registry),
                environment: this.environment
            });
            return registry;
        }
        catch (error) {
            this.logger.error('Failed to load test data', { error, fixturesPath: this.fixturesPath });
            throw new ConfigurationError(`Failed to load test data from ${this.fixturesPath}: ${error.message}`);
        }
    }
    /**
     * Recursively resolve environment variable references in a value.
     * Supports ${VAR} syntax in strings, objects, and arrays.
     *
     * @param value - The value to resolve
     * @returns The value with environment variables resolved
     * @throws {ConfigurationError} If a required environment variable is missing
     * @requirements 6.2
     */
    resolveEnvVars(value) {
        if (typeof value === 'string') {
            // Match ${VAR} patterns
            return value.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
                const envValue = process.env[envVar];
                if (envValue === undefined) {
                    throw new ConfigurationError(`Missing environment variable: ${envVar}`, [envVar]);
                }
                return envValue;
            });
        }
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map(v => this.resolveEnvVars(v));
            }
            const resolved = {};
            for (const [k, v] of Object.entries(value)) {
                resolved[k] = this.resolveEnvVars(v);
            }
            return resolved;
        }
        return value;
    }
}
//# sourceMappingURL=test-data-manager.js.map