/**
 * CLI command for generating page objects.
 *
 * @module cli/commands/generate-page
 * @requirements 18.1, 18.7, 18.8
 */
import { Command } from 'commander';
/** Options for page generation */
interface GeneratePageOptions {
    verbose?: boolean;
}
/**
 * Main function to generate page object.
 */
export declare function generatePage(name: string, domain?: string, options?: GeneratePageOptions): void;
/**
 * Creates the generate:page command for the CLI.
 */
export declare function createGeneratePageCommand(): Command;
export {};
//# sourceMappingURL=generate-page.d.ts.map