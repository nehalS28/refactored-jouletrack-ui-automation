/**
 * CLI command to build dependency graph for smart test selection
 *
 * @module cli/commands/build-graph
 * @requirements 20.2
 */
import { DependencyGraphBuilder } from '../../src/utils/dependency-graph.js';
import * as path from 'path';
/**
 * Build dependency graph from source files and cache it
 *
 * @param srcPath - Root path to scan (defaults to current working directory)
 * @requirements 20.2
 */
export async function buildDependencyGraph(srcPath = process.cwd()) {
    console.log('🔨 Building dependency graph...');
    const cachePath = path.join(srcPath, '.cache', 'test-dependency-graph.json');
    try {
        const builder = new DependencyGraphBuilder();
        const graph = await builder.build(srcPath);
        // Save to cache
        await builder.save(cachePath);
        console.log(`✅ Dependency graph built successfully`);
        console.log(`   Nodes: ${graph.nodes.size}`);
        console.log(`   Cache: ${cachePath}`);
        // Print summary by type
        const summary = {
            features: 0,
            steps: 0,
            pages: 0,
            locators: 0
        };
        for (const node of graph.nodes.values()) {
            if (node.type === 'feature')
                summary.features++;
            else if (node.type === 'step')
                summary.steps++;
            else if (node.type === 'page')
                summary.pages++;
            else if (node.type === 'locator')
                summary.locators++;
        }
        console.log('\n📊 Summary:');
        console.log(`   Features: ${summary.features}`);
        console.log(`   Steps: ${summary.steps}`);
        console.log(`   Pages: ${summary.pages}`);
        console.log(`   Locators: ${summary.locators}`);
    }
    catch (error) {
        console.error('❌ Failed to build dependency graph:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=build-graph.js.map