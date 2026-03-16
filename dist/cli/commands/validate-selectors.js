/**
 * CLI command to validate selectors via Morpheus plugin.
 * Validates all locator selectors against JouleTrack frontend codebase.
 *
 * @module cli/commands/validate-selectors
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.5
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { MorpheusPlugin } from '../../src/plugins/morpheus/morpheus-plugin.js';
/**
 * Create a simple console logger for CLI usage.
 */
function createConsoleLogger() {
    return {
        debug: (message, data) => {
            if (process.env.DEBUG) {
                console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
            }
        },
        info: (message, data) => {
            console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
        },
        warn: (message, data) => {
            console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : '');
        },
        error: (message, data) => {
            console.error(`[ERROR] ${message}`, data ? JSON.stringify(data) : '');
        },
    };
}
/**
 * Extract all selectors from locator registry files.
 *
 * @param registryPath - Path to locator registry directory
 * @returns Array of selectors with metadata
 */
async function extractSelectors(registryPath) {
    const selectors = [];
    try {
        const files = await fs.readdir(registryPath);
        const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
        for (const file of yamlFiles) {
            const filePath = path.join(registryPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const registry = yaml.parse(content);
            // Extract selectors from nested structure
            for (const [page, components] of Object.entries(registry)) {
                for (const [component, value] of Object.entries(components)) {
                    if (typeof value === 'object' && value !== null) {
                        if ('selector' in value) {
                            // Direct locator definition
                            selectors.push({
                                selector: value.selector,
                                source: `${file}:${page}.${component}`,
                            });
                        }
                        else {
                            // Nested elements
                            for (const [element, locator] of Object.entries(value)) {
                                if (typeof locator === 'object' && locator !== null && 'selector' in locator) {
                                    selectors.push({
                                        selector: locator.selector,
                                        source: `${file}:${page}.${component}.${element}`,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    catch (error) {
        throw new Error(`Failed to extract selectors: ${error instanceof Error ? error.message : String(error)}`);
    }
    return selectors;
}
/**
 * Validate selectors using Morpheus plugin.
 *
 * @param options - Command options
 */
export async function validateSelectors(options = {}) {
    const logger = createConsoleLogger();
    // Default configuration
    const registryPath = options.registryPath || path.join(process.cwd(), 'src', 'locators', 'registry');
    const config = {
        enabled: true,
        endpoint: options.endpoint || process.env.MORPHEUS_ENDPOINT || 'http://localhost:3000/morpheus',
        timeout: options.timeout || 5000,
    };
    console.log('🔍 Validating selectors via Morpheus...\n');
    console.log(`Registry path: ${registryPath}`);
    console.log(`Morpheus endpoint: ${config.endpoint}\n`);
    try {
        // Extract selectors from registry
        const selectorData = await extractSelectors(registryPath);
        if (selectorData.length === 0) {
            console.log('⚠️  No selectors found in registry');
            return;
        }
        console.log(`Found ${selectorData.length} selectors to validate\n`);
        // Initialize Morpheus plugin
        const plugin = new MorpheusPlugin(config, logger);
        await plugin.initialize();
        // Validate selectors
        const selectors = selectorData.map(s => s.selector);
        const results = await plugin.validateSelectors(selectors);
        // Report results
        let validCount = 0;
        let invalidCount = 0;
        const issues = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const source = selectorData[i].source;
            if (result.valid) {
                validCount++;
                console.log(`✅ ${source}`);
                console.log(`   Selector: ${result.selector}`);
                if (result.existingMatches && result.existingMatches.length > 0) {
                    console.log(`   Found in: ${result.existingMatches[0].path}`);
                }
                console.log('');
            }
            else {
                invalidCount++;
                console.log(`❌ ${source}`);
                console.log(`   Selector: ${result.selector}`);
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
                if (result.suggestions && result.suggestions.length > 0) {
                    console.log(`   Suggestions: ${result.suggestions.join(', ')}`);
                }
                console.log('');
                issues.push(`${source}: ${result.selector}`);
            }
        }
        // Summary
        console.log('═'.repeat(60));
        console.log('Summary:');
        console.log(`  Total selectors: ${results.length}`);
        console.log(`  ✅ Valid: ${validCount}`);
        console.log(`  ❌ Invalid: ${invalidCount}`);
        console.log('═'.repeat(60));
        if (invalidCount > 0) {
            console.log('\n⚠️  Some selectors could not be validated');
            console.log('Review the issues above and update your locator registry');
            process.exit(1);
        }
        else {
            console.log('\n✅ All selectors validated successfully!');
        }
        // Show query log if debug mode
        if (process.env.DEBUG) {
            const queryLog = plugin.getQueryLog();
            console.log('\nQuery Log:');
            console.log(JSON.stringify(queryLog, null, 2));
        }
    }
    catch (error) {
        logger.error('Validation failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    }
}
//# sourceMappingURL=validate-selectors.js.map