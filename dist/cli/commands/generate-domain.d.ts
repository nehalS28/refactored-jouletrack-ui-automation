/**
 * CLI command for generating complete domain structure.
 *
 * @module cli/commands/generate-domain
 * @requirements 18.1, 18.7, 18.8
 */
import { Command } from 'commander';
/** Options for domain generation */
interface GenerateDomainOptions {
    verbose?: boolean;
}
/**
 * Main function to generate complete domain structure.
 */
export declare function generateDomain(name: string, options?: GenerateDomainOptions): void;
/**
 * Creates the generate:domain command for the CLI.
 */
export declare function createGenerateDomainCommand(): Command;
export {};
//# sourceMappingURL=generate-domain.d.ts.map