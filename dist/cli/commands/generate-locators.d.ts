/**
 * CLI command for generating typed locators from YAML registry files.
 *
 * @module cli/commands/generate-locators
 * @requirements 1.2, 1.4, 14.2
 *
 * This command reads all YAML files from src/locators/registry/,
 * parses them, and generates TypeScript code with const assertions
 * for type-safe locator access.
 */
import { Command } from 'commander';
/**
 * Main function to generate locators.
 */
export declare function generateLocators(options: {
    registryDir: string;
    outputFile: string;
    verbose?: boolean;
}): void;
/**
 * Creates the generate:locators command for the CLI.
 */
export declare function createGenerateLocatorsCommand(): Command;
//# sourceMappingURL=generate-locators.d.ts.map