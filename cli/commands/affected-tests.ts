/**
 * CLI command to get affected tests based on changed files
 * 
 * @module cli/commands/affected-tests
 * @requirements 20.2, 20.7
 */

import { DependencyGraphBuilder } from '../../src/utils/dependency-graph.js';
import * as path from 'path';

/**
 * Get tests affected by changed files
 * 
 * @param changedFiles - Array of changed file paths
 * @param srcPath - Root path (defaults to current working directory)
 * @requirements 20.2, 20.7
 */
export async function getAffectedTests(changedFiles: string[], srcPath: string = process.cwd()): Promise<void> {
  console.log('🔍 Finding affected tests...');

  if (changedFiles.length === 0) {
    console.log('⚠️  No changed files provided');
    console.log('Usage: npm run cli graph:affected -- --files file1.ts,file2.ts');
    process.exit(1);
  }

  const cachePath = path.join(srcPath, '.cache', 'test-dependency-graph.json');

  try {
    const builder = new DependencyGraphBuilder();
    const graph = await builder.load(cachePath);

    if (!graph) {
      console.error('❌ Dependency graph cache not found');
      console.log('   Run: npm run cli graph:build');
      process.exit(1);
    }

    console.log(`   Loaded graph with ${graph.nodes.size} nodes`);
    console.log(`   Changed files: ${changedFiles.length}`);

    // Resolve changed files to absolute paths
    const resolvedFiles = changedFiles.map(file => {
      if (path.isAbsolute(file)) {
        return file;
      }
      return path.resolve(srcPath, file);
    });

    const affectedTests = builder.getAffectedTests(resolvedFiles);

    if (affectedTests.length === 0) {
      console.log('\n✅ No tests affected by these changes');
    } else {
      console.log(`\n✅ Found ${affectedTests.length} affected test(s):\n`);
      
      for (const test of affectedTests) {
        // Make path relative for readability
        const relativePath = path.relative(srcPath, test);
        console.log(`   - ${relativePath}`);
      }

      // Output machine-readable format for CI/CD
      console.log('\n📋 Machine-readable output:');
      console.log(JSON.stringify(affectedTests, null, 2));
    }
  } catch (error) {
    console.error('❌ Failed to get affected tests:', error);
    process.exit(1);
  }
}
