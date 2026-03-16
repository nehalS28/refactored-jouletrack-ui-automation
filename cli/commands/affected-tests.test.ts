/**
 * Unit tests for affected-tests CLI command
 * 
 * @module cli/commands/affected-tests.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAffectedTests } from './affected-tests.js';
import { DependencyGraphBuilder } from '../../src/utils/dependency-graph.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('getAffectedTests', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'affected-tests-test-'));

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

  test('finds affected tests for changed files', async () => {
    // Create test structure
    const featurePath = path.join(tempDir, 'features', 'test.feature');
    const stepPath = path.join(tempDir, 'steps', 'test.steps.ts');
    const pagePath = path.join(tempDir, 'pages', 'test-page.ts');

    await fs.mkdir(path.dirname(featurePath), { recursive: true });
    await fs.mkdir(path.dirname(stepPath), { recursive: true });
    await fs.mkdir(path.dirname(pagePath), { recursive: true });

    await fs.writeFile(
      featurePath,
      'Feature: Test\n  Scenario: Test\n    When I do something\n'
    );

    await fs.writeFile(
      stepPath,
      "import { TestPage } from '../pages/test-page.js';\nWhen('I do something', async function() {});\n"
    );

    await fs.writeFile(
      pagePath,
      'export class TestPage {}\n'
    );

    // Build and save graph
    const builder = new DependencyGraphBuilder();
    await builder.build(tempDir);
    const cachePath = path.join(tempDir, '.cache', 'test-dependency-graph.json');
    await builder.save(cachePath);

    // Test with changed page file
    await getAffectedTests([pagePath], tempDir);

    // Verify output
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Finding affected tests'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 affected test'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test.feature'));
  });

  test('handles no affected tests', async () => {
    // Create test structure
    const featurePath = path.join(tempDir, 'features', 'test.feature');
    await fs.mkdir(path.dirname(featurePath), { recursive: true });
    await fs.writeFile(featurePath, 'Feature: Test\n');

    // Build and save graph
    const builder = new DependencyGraphBuilder();
    await builder.build(tempDir);
    const cachePath = path.join(tempDir, '.cache', 'test-dependency-graph.json');
    await builder.save(cachePath);

    // Test with unrelated file
    const unrelatedFile = path.join(tempDir, 'unrelated.ts');
    await getAffectedTests([unrelatedFile], tempDir);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No tests affected'));
  });

  test('exits with error when no files provided', async () => {
    try {
      await getAffectedTests([], tempDir);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toContain('process.exit(1)');
    }

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No changed files'));
  });

  test('exits with error when cache not found', async () => {
    try {
      await getAffectedTests(['some-file.ts'], tempDir);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toContain('process.exit(1)');
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('cache not found'));
  });

  test('handles relative file paths', async () => {
    // Create test structure
    const featurePath = path.join(tempDir, 'features', 'test.feature');
    const stepPath = path.join(tempDir, 'steps', 'test.steps.ts');

    await fs.mkdir(path.dirname(featurePath), { recursive: true });
    await fs.mkdir(path.dirname(stepPath), { recursive: true });

    await fs.writeFile(
      featurePath,
      'Feature: Test\n  Scenario: Test\n    When I do something\n'
    );

    await fs.writeFile(
      stepPath,
      "When('I do something', async function() {});\n"
    );

    // Build and save graph
    const builder = new DependencyGraphBuilder();
    await builder.build(tempDir);
    const cachePath = path.join(tempDir, '.cache', 'test-dependency-graph.json');
    await builder.save(cachePath);

    // Test with relative path
    await getAffectedTests(['steps/test.steps.ts'], tempDir);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 affected test'));
  });

  test('outputs machine-readable JSON', async () => {
    // Create test structure
    const featurePath = path.join(tempDir, 'features', 'test.feature');
    const stepPath = path.join(tempDir, 'steps', 'test.steps.ts');

    await fs.mkdir(path.dirname(featurePath), { recursive: true });
    await fs.mkdir(path.dirname(stepPath), { recursive: true });

    await fs.writeFile(
      featurePath,
      'Feature: Test\n  Scenario: Test\n    When I do something\n'
    );

    await fs.writeFile(
      stepPath,
      "When('I do something', async function() {});\n"
    );

    // Build and save graph
    const builder = new DependencyGraphBuilder();
    await builder.build(tempDir);
    const cachePath = path.join(tempDir, '.cache', 'test-dependency-graph.json');
    await builder.save(cachePath);

    await getAffectedTests([stepPath], tempDir);

    // Verify JSON output
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Machine-readable output'));
    
    // Find the JSON output call
    const jsonCall = consoleLogSpy.mock.calls.find(call => {
      const arg = call[0];
      return typeof arg === 'string' && arg.startsWith('[');
    });
    
    expect(jsonCall).toBeDefined();
    const json = JSON.parse(jsonCall![0] as string);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });
});
