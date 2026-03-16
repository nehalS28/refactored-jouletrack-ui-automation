/**
 * Unit tests for DependencyGraphBuilder
 * 
 * @module utils/dependency-graph.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { DependencyGraphBuilder } from './dependency-graph.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DependencyGraphBuilder', () => {
  let tempDir: string;
  let graphBuilder: DependencyGraphBuilder;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dep-graph-test-'));
    graphBuilder = new DependencyGraphBuilder();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('build()', () => {
    test('builds empty graph for empty directory', async () => {
      const graph = await graphBuilder.build(tempDir);

      expect(graph.nodes.size).toBe(0);
      expect(graph.lastUpdated).toBeInstanceOf(Date);
    });

    test('identifies feature files', async () => {
      const featurePath = path.join(tempDir, 'features', 'login.feature');
      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.writeFile(
        featurePath,
        'Feature: Login\n  Scenario: User logs in\n    When I enter credentials\n'
      );

      const graph = await graphBuilder.build(tempDir);

      expect(graph.nodes.has(featurePath)).toBe(true);
      const node = graph.nodes.get(featurePath);
      expect(node?.type).toBe('feature');
      expect(node?.path).toBe(featurePath);
    });

    test('identifies step definition files', async () => {
      const stepPath = path.join(tempDir, 'steps', 'login.steps.ts');
      await fs.mkdir(path.dirname(stepPath), { recursive: true });
      await fs.writeFile(
        stepPath,
        "import { Given } from '@cucumber/cucumber';\nGiven('I enter credentials', async function() {});\n"
      );

      const graph = await graphBuilder.build(tempDir);

      expect(graph.nodes.has(stepPath)).toBe(true);
      const node = graph.nodes.get(stepPath);
      expect(node?.type).toBe('step');
    });

    test('identifies page object files', async () => {
      const pagePath = path.join(tempDir, 'pages', 'login-page.ts');
      await fs.mkdir(path.dirname(pagePath), { recursive: true });
      await fs.writeFile(
        pagePath,
        'export class LoginPage {\n  async login() {}\n}\n'
      );

      const graph = await graphBuilder.build(tempDir);

      expect(graph.nodes.has(pagePath)).toBe(true);
      const node = graph.nodes.get(pagePath);
      expect(node?.type).toBe('page');
    });

    test('identifies locator YAML files', async () => {
      const locatorPath = path.join(tempDir, 'locators', 'authentication.yaml');
      await fs.mkdir(path.dirname(locatorPath), { recursive: true });
      await fs.writeFile(
        locatorPath,
        'authentication:\n  loginForm:\n    selector: "#login"\n'
      );

      const graph = await graphBuilder.build(tempDir);

      expect(graph.nodes.has(locatorPath)).toBe(true);
      const node = graph.nodes.get(locatorPath);
      expect(node?.type).toBe('locator');
    });

    test('builds Feature → Step dependency', async () => {
      const featurePath = path.join(tempDir, 'features', 'login.feature');
      const stepPath = path.join(tempDir, 'steps', 'login.steps.ts');

      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.mkdir(path.dirname(stepPath), { recursive: true });

      await fs.writeFile(
        featurePath,
        'Feature: Login\n  Scenario: Test\n    When I enter username "test"\n'
      );

      await fs.writeFile(
        stepPath,
        'When(\'I enter username {string}\', async function(username) {});\n'
      );

      const graph = await graphBuilder.build(tempDir);

      const featureNode = graph.nodes.get(featurePath);
      expect(featureNode?.dependencies).toContain(stepPath);

      const stepNode = graph.nodes.get(stepPath);
      expect(stepNode?.dependents).toContain(featurePath);
    });

    test('builds Step → Page dependency', async () => {
      const stepPath = path.join(tempDir, 'steps', 'login.steps.ts');
      const pagePath = path.join(tempDir, 'pages', 'login-page.ts');

      await fs.mkdir(path.dirname(stepPath), { recursive: true });
      await fs.mkdir(path.dirname(pagePath), { recursive: true });

      await fs.writeFile(
        stepPath,
        "import { LoginPage } from '../pages/login-page.js';\nWhen('I login', async function() {});\n"
      );

      await fs.writeFile(
        pagePath,
        'export class LoginPage {}\n'
      );

      const graph = await graphBuilder.build(tempDir);

      const stepNode = graph.nodes.get(stepPath);
      expect(stepNode?.dependencies).toContain(pagePath);

      const pageNode = graph.nodes.get(pagePath);
      expect(pageNode?.dependents).toContain(stepPath);
    });

    test('builds Page → Locator dependency', async () => {
      const pagePath = path.join(tempDir, 'pages', 'login-page.ts');
      const locatorPath = path.join(tempDir, 'locators', 'authentication.yaml');

      await fs.mkdir(path.dirname(pagePath), { recursive: true });
      await fs.mkdir(path.dirname(locatorPath), { recursive: true });

      await fs.writeFile(
        pagePath,
        'export class LoginPage {\n  async login() {\n    this.locators.authentication.loginForm;\n  }\n}\n'
      );

      await fs.writeFile(
        locatorPath,
        'authentication:\n  loginForm:\n    selector: "#login"\n'
      );

      const graph = await graphBuilder.build(tempDir);

      const pageNode = graph.nodes.get(pagePath);
      expect(pageNode?.dependencies).toContain(locatorPath);

      const locatorNode = graph.nodes.get(locatorPath);
      expect(locatorNode?.dependents).toContain(pagePath);
    });
  });

  describe('getAffectedTests()', () => {
    test('returns empty array for unknown files', async () => {
      await graphBuilder.build(tempDir);
      const affected = graphBuilder.getAffectedTests(['unknown.ts']);

      expect(affected).toEqual([]);
    });

    test('returns feature when locator changes', async () => {
      const featurePath = path.join(tempDir, 'features', 'login.feature');
      const stepPath = path.join(tempDir, 'steps', 'login.steps.ts');
      const pagePath = path.join(tempDir, 'pages', 'login-page.ts');
      const locatorPath = path.join(tempDir, 'locators', 'authentication.yaml');

      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.mkdir(path.dirname(stepPath), { recursive: true });
      await fs.mkdir(path.dirname(pagePath), { recursive: true });
      await fs.mkdir(path.dirname(locatorPath), { recursive: true });

      await fs.writeFile(
        featurePath,
        'Feature: Login\n  Scenario: Test\n    When I login\n'
      );

      await fs.writeFile(
        stepPath,
        "import { LoginPage } from '../pages/login-page.js';\nWhen('I login', async function() {});\n"
      );

      await fs.writeFile(
        pagePath,
        'export class LoginPage {\n  async login() {\n    this.locators.authentication.loginForm;\n  }\n}\n'
      );

      await fs.writeFile(
        locatorPath,
        'authentication:\n  loginForm:\n    selector: "#login"\n'
      );

      await graphBuilder.build(tempDir);
      const affected = graphBuilder.getAffectedTests([locatorPath]);

      expect(affected).toContain(featurePath);
    });

    test('returns feature when page changes', async () => {
      const featurePath = path.join(tempDir, 'features', 'login.feature');
      const stepPath = path.join(tempDir, 'steps', 'login.steps.ts');
      const pagePath = path.join(tempDir, 'pages', 'login-page.ts');

      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.mkdir(path.dirname(stepPath), { recursive: true });
      await fs.mkdir(path.dirname(pagePath), { recursive: true });

      await fs.writeFile(
        featurePath,
        'Feature: Login\n  Scenario: Test\n    When I login\n'
      );

      await fs.writeFile(
        stepPath,
        "import { LoginPage } from '../pages/login-page.js';\nWhen('I login', async function() {});\n"
      );

      await fs.writeFile(
        pagePath,
        'export class LoginPage {}\n'
      );

      await graphBuilder.build(tempDir);
      const affected = graphBuilder.getAffectedTests([pagePath]);

      expect(affected).toContain(featurePath);
    });

    test('returns feature when step changes', async () => {
      const featurePath = path.join(tempDir, 'features', 'login.feature');
      const stepPath = path.join(tempDir, 'steps', 'login.steps.ts');

      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.mkdir(path.dirname(stepPath), { recursive: true });

      await fs.writeFile(
        featurePath,
        'Feature: Login\n  Scenario: Test\n    When I login\n'
      );

      await fs.writeFile(
        stepPath,
        "When('I login', async function() {});\n"
      );

      await graphBuilder.build(tempDir);
      const affected = graphBuilder.getAffectedTests([stepPath]);

      expect(affected).toContain(featurePath);
    });

    test('returns multiple affected features', async () => {
      const feature1Path = path.join(tempDir, 'features', 'login.feature');
      const feature2Path = path.join(tempDir, 'features', 'signup.feature');
      const stepPath = path.join(tempDir, 'steps', 'auth.steps.ts');

      await fs.mkdir(path.dirname(feature1Path), { recursive: true });
      await fs.mkdir(path.dirname(stepPath), { recursive: true });

      await fs.writeFile(
        feature1Path,
        'Feature: Login\n  Scenario: Test\n    When I authenticate\n'
      );

      await fs.writeFile(
        feature2Path,
        'Feature: Signup\n  Scenario: Test\n    When I authenticate\n'
      );

      await fs.writeFile(
        stepPath,
        "When('I authenticate', async function() {});\n"
      );

      await graphBuilder.build(tempDir);
      const affected = graphBuilder.getAffectedTests([stepPath]);

      expect(affected).toContain(feature1Path);
      expect(affected).toContain(feature2Path);
    });
  });

  describe('save() and load()', () => {
    test('saves graph to JSON file', async () => {
      const featurePath = path.join(tempDir, 'features', 'test.feature');
      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.writeFile(featurePath, 'Feature: Test\n');

      await graphBuilder.build(tempDir);
      const cachePath = path.join(tempDir, 'graph.json');
      await graphBuilder.save(cachePath);

      const content = await fs.readFile(cachePath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.nodes).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
    });

    test('loads graph from JSON file', async () => {
      const featurePath = path.join(tempDir, 'features', 'test.feature');
      await fs.mkdir(path.dirname(featurePath), { recursive: true });
      await fs.writeFile(featurePath, 'Feature: Test\n');

      await graphBuilder.build(tempDir);
      const cachePath = path.join(tempDir, 'graph.json');
      await graphBuilder.save(cachePath);

      const newBuilder = new DependencyGraphBuilder();
      const loadedGraph = await newBuilder.load(cachePath);

      expect(loadedGraph).not.toBeNull();
      expect(loadedGraph!.nodes.size).toBeGreaterThan(0);
      expect(loadedGraph!.nodes.has(featurePath)).toBe(true);
    });

    test('returns null for non-existent cache file', async () => {
      const cachePath = path.join(tempDir, 'non-existent.json');
      const loadedGraph = await graphBuilder.load(cachePath);

      expect(loadedGraph).toBeNull();
    });

    test('preserves dependency relationships after save/load', async () => {
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

      await graphBuilder.build(tempDir);
      const cachePath = path.join(tempDir, 'graph.json');
      await graphBuilder.save(cachePath);

      const newBuilder = new DependencyGraphBuilder();
      const loadedGraph = await newBuilder.load(cachePath);

      const featureNode = loadedGraph!.nodes.get(featurePath);
      expect(featureNode?.dependencies).toContain(stepPath);

      const stepNode = loadedGraph!.nodes.get(stepPath);
      expect(stepNode?.dependents).toContain(featurePath);
    });
  });
});
