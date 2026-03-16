/**
 * CLI command to validate selectors via Morpheus plugin.
 * Validates all locator selectors against JouleTrack frontend codebase.
 *
 * @module cli/commands/validate-selectors
 * @requirements 19.1, 19.2, 19.3, 19.4, 19.5
 */
/**
 * Validate selectors using Morpheus plugin.
 *
 * @param options - Command options
 */
export declare function validateSelectors(options?: {
    registryPath?: string;
    endpoint?: string;
    timeout?: number;
}): Promise<void>;
//# sourceMappingURL=validate-selectors.d.ts.map