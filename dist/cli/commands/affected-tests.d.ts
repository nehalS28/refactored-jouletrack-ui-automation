/**
 * CLI command to get affected tests based on changed files
 *
 * @module cli/commands/affected-tests
 * @requirements 20.2, 20.7
 */
/**
 * Get tests affected by changed files
 *
 * @param changedFiles - Array of changed file paths
 * @param srcPath - Root path (defaults to current working directory)
 * @requirements 20.2, 20.7
 */
export declare function getAffectedTests(changedFiles: string[], srcPath?: string): Promise<void>;
//# sourceMappingURL=affected-tests.d.ts.map