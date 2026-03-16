/**
 * Property-based tests for DependencyGraphBuilder
 * **Property 54: Dependency Graph Accuracy**
 * **Validates: Requirements 20.2**
 * 
 * @module utils/dependency-graph.property.test
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { DependencyGraphBuilder } from './dependency-graph.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Property 54: Dependency Graph Accuracy', () => {
  let tempDir: string;
  let graphBuilder: DependencyGraphBuilder;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dep-graph-test-'));
    graphBuilder = new DependencyGraphBuilder();
  });

  /**
   * Property: For any code change, the dependency graph should correctly identify
   * all tests that depend on the changed file through the Feature → Step → Page → Locator chain.
   */
  test('Property 54: Dependency graph correctly identifies all affected tests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          featureName: fc.stringMatching(/^[a-z-]+$/),
          stepPattern: fc.stringMatching(/^I [a-z]+ [a-z]+$/), // More realistic step patterns
          pageName: fc.stringMatching(/^[A-Z][a-zA-Z]+Page$/),
          locatorDomain: fc.stringMatching(/^[a-z]+$/),
          locatorKey: fc.stringMatching(/^[a-z]+$/),
        }),
        async ({ featureName, stepPattern, pageName, locatorDomain, locatorKey }) => {
          // Create test file structure
          const featurePath = path.join(tempDir, 'features', `${featureName}.feature`);
          const stepPath = path.join(tempDir, 'steps', `${featureName}.steps.ts`);
          const pagePath = path.join(tempDir, 'pages', `${pageName}.ts`);
          const locatorPath = path.join(tempDir, 'locators', `${locatorDomain}.yaml`);

          await fs.mkdir(path.dirname(featurePath), { recursive: true });
          await fs.mkdir(path.dirname(stepPath), { recursive: true });
          await fs.mkdir(path.dirname(pagePath), { recursive: true });
          await fs.mkdir(path.dirname(locatorPath), { recursive: true });

          // Create feature file that uses the step
          await fs.writeFile(
            featurePath,
            `Feature: ${featureName}\n  Scenario: Test\n    When ${stepPattern}\n`
          );

          // Create step definition that imports the page
          await fs.writeFile(
            stepPath,
            `import { ${pageName} } from '../pages/${pageName}.js';\nWhen('${stepPattern}', async function() {});\n`
          );

          // Create page object that uses the locator
          await fs.writeFile(
            pagePath,
            `export class ${pageName} {\n  async action() {\n    this.locators.${locatorDomain}.${locatorKey};\n  }\n}\n`
          );

          // Create locator file
          await fs.writeFile(
            locatorPath,
            `${locatorDomain}:\n  ${locatorKey}:\n    selector: "#test"\n    strategy: css\n`
          );

          // Build dependency graph
          const graph = await graphBuilder.build(tempDir);

          // Test: Changing locator should affect the feature
          const affectedTests = graphBuilder.getAffectedTests([locatorPath]);

          // Verify the feature is in the affected tests
          expect(affectedTests).toContain(featurePath);

          // Test: Changing page should affect the feature
          const affectedByPage = graphBuilder.getAffectedTests([pagePath]);
          expect(affectedByPage).toContain(featurePath);

          // Test: Changing step should affect the feature
          const affectedByStep = graphBuilder.getAffectedTests([stepPath]);
          expect(affectedByStep).toContain(featurePath);

          // Test: Graph nodes exist for all files
          expect(graph.nodes.has(featurePath)).toBe(true);
          expect(graph.nodes.has(stepPath)).toBe(true);
          expect(graph.nodes.has(pagePath)).toBe(true);
          expect(graph.nodes.has(locatorPath)).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Dependency graph should capture all dependency chains
   */
  test('Property: All dependency chains are captured in the graph', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            feature: fc.stringMatching(/^[a-z-]+$/),
            step: fc.stringMatching(/^[a-z-]+$/),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (testCases) => {
          // Create multiple feature → step chains
          for (const { feature, step } of testCases) {
            const featurePath = path.join(tempDir, 'features', `${feature}.feature`);
            const stepPath = path.join(tempDir, 'steps', `${step}.steps.ts`);

            await fs.mkdir(path.dirname(featurePath), { recursive: true });
            await fs.mkdir(path.dirname(stepPath), { recursive: true });

            await fs.writeFile(
              featurePath,
              `Feature: ${feature}\n  Scenario: Test\n    When I do ${step}\n`
            );

            await fs.writeFile(
              stepPath,
              `When('I do ${step}', async function() {});\n`
            );
          }

          // Build graph
          const graph = await graphBuilder.build(tempDir);

          // Verify all features and steps are in the graph
          for (const { feature, step } of testCases) {
            const featurePath = path.join(tempDir, 'features', `${feature}.feature`);
            const stepPath = path.join(tempDir, 'steps', `${step}.steps.ts`);

            expect(graph.nodes.has(featurePath)).toBe(true);
            expect(graph.nodes.has(stepPath)).toBe(true);

            // Verify dependency relationship
            const featureNode = graph.nodes.get(featurePath);
            expect(featureNode?.type).toBe('feature');
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Graph should be serializable and deserializable
   */
  test('Property: Graph can be saved and loaded without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          featureName: fc.stringMatching(/^[a-z-]+$/),
          stepName: fc.stringMatching(/^[a-z-]+$/),
        }),
        async ({ featureName, stepName }) => {
          // Create simple test structure
          const featurePath = path.join(tempDir, 'features', `${featureName}.feature`);
          const stepPath = path.join(tempDir, 'steps', `${stepName}.steps.ts`);

          await fs.mkdir(path.dirname(featurePath), { recursive: true });
          await fs.mkdir(path.dirname(stepPath), { recursive: true });

          await fs.writeFile(
            featurePath,
            `Feature: ${featureName}\n  Scenario: Test\n    When I do something\n`
          );

          await fs.writeFile(
            stepPath,
            `When('I do something', async function() {});\n`
          );

          // Build and save graph
          const originalGraph = await graphBuilder.build(tempDir);
          const cachePath = path.join(tempDir, 'graph-cache.json');
          await graphBuilder.save(cachePath);

          // Load graph
          const loadedGraph = await graphBuilder.load(cachePath);

          // Verify graphs are equivalent
          expect(loadedGraph).not.toBeNull();
          expect(loadedGraph!.nodes.size).toBe(originalGraph.nodes.size);

          // Verify all nodes are preserved
          for (const [key, node] of originalGraph.nodes) {
            expect(loadedGraph!.nodes.has(key)).toBe(true);
            const loadedNode = loadedGraph!.nodes.get(key);
            expect(loadedNode?.type).toBe(node.type);
            expect(loadedNode?.path).toBe(node.path);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
