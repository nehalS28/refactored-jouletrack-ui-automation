/**
 * Unit tests for build-graph CLI command
 * 
 * @module cli/commands/build-graph.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from './build-graph.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('buildDependencyGraph', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'build-graph-test-'));

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test('builds dependency graph and saves to cache', async () => {
    // Create test files
    const featurePath = path.join(tempDir, 'features', 'test.feature');
    await fs.mkdir(path.dirname(featurePath), { recursive: true });
    await fs.writeFile(featurePath, 'Feature: Test\n  Scenario: Test\n    When I do something\n');

    const stepPath = path.join(tempDir, 'steps', 'test.steps.ts');
    await fs.mkdir(path.dirname(stepPath), { recursive: true });
    await fs.writeFile(stepPath, "When('I do something', async function() {});\n");

    await buildDependencyGraph(tempDir);

    // Verify cache file was created
    const cachePath = path.join(tempDir, '.cache', 'test-dependency-graph.json');
    const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
    expect(cacheExists).toBe(true);

    // Verify cache content
    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    const data = JSON.parse(cacheContent);
    expect(data.nodes).toBeDefined();
    expect(data.lastUpdated).toBeDefined();

    // Verify console output
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Building dependency graph'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('built successfully'));
  });

  test('prints summary of graph nodes', async () => {
    // Create test files of different types
    await fs.mkdir(path.join(tempDir, 'features'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'features', 'test.feature'), 'Feature: Test\n');

    await fs.mkdir(path.join(tempDir, 'steps'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'steps', 'test.steps.ts'), "When('test', async function() {});\n");

    await fs.mkdir(path.join(tempDir, 'pages'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'pages', 'test-page.ts'), 'export class TestPage {}\n');

    await fs.mkdir(path.join(tempDir, 'locators'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'locators', 'test.yaml'), 'test:\n  key:\n    selector: "#test"\n');

    await buildDependencyGraph(tempDir);

    // Verify summary output
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Features: 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Steps: 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Pages: 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Locators: 1'));
  });

  test('handles empty directory', async () => {
    await buildDependencyGraph(tempDir);

    // Should still create cache with empty graph
    const cachePath = path.join(tempDir, '.cache', 'test-dependency-graph.json');
    const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
    expect(cacheExists).toBe(true);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Nodes: 0'));
  });

  test('exits with error on failure', async () => {
    // Make .cache directory read-only to cause write failure
    await fs.mkdir(path.join(tempDir, '.cache'), { recursive: true });
    await fs.chmod(path.join(tempDir, '.cache'), 0o444);

    try {
      await buildDependencyGraph(tempDir);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toContain('process.exit(1)');
    }

    // Check that console.error was called (it's called with 2 args: message and error object)
    expect(consoleErrorSpy).toHaveBeenCalled();
    const firstCall = consoleErrorSpy.mock.calls[0];
    expect(firstCall[0]).toContain('Failed to build');
  });
});
