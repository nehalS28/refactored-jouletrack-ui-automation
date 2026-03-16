/**
 * CLI command for generating feature files and step definitions.
 *
 * @module cli/commands/generate-feature
 * @requirements 18.1, 18.2, 18.7, 18.8
 */
import { Command } from 'commander';
/** Options for feature generation */
interface GenerateFeatureOptions {
    verbose?: boolean;
}
/**
 * Main function to generate feature and step definitions.
 */
export declare function generateFeature(name: string, domain?: string, options?: GenerateFeatureOptions): void;
/**
 * Creates the generate:feature command for the CLI.
 */
export declare function createGenerateFeatureCommand(): Command;
export {};
//# sourceMappingURL=generate-feature.d.ts.map