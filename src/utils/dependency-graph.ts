/**
 * Dependency Graph Builder for Smart Test Selection
 * Maps Feature → Step → Page → Locator dependencies
 * 
 * @module utils/dependency-graph
 * @requirements 20.2, 20.7
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Represents a node in the dependency graph
 */
export interface DependencyNode {
  type: 'feature' | 'step' | 'page' | 'locator';
  path: string;
  dependencies: string[];
  dependents: string[];
}

/**
 * Represents the complete dependency graph
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  lastUpdated: Date;
}

/**
 * Parsed feature file information
 */
interface FeatureInfo {
  path: string;
  steps: string[];
}

/**
 * Parsed step definition information
 */
interface StepInfo {
  path: string;
  pattern: RegExp;
  imports: string[];
}

/**
 * Parsed page object information
 */
interface PageInfo {
  path: string;
  locatorRefs: string[];
}

/**
 * Parsed locator file information
 */
interface LocatorInfo {
  path: string;
  domain: string;
}

/**
 * Builds and manages dependency graph for smart test selection
 * 
 * @requirements 20.2, 20.7
 */
export class DependencyGraphBuilder {
  private graph: DependencyGraph = {
    nodes: new Map(),
    lastUpdated: new Date()
  };

  /**
   * Build dependency graph from source files
   * Scans Feature → Step → Page → Locator dependencies
   * 
   * @param srcPath - Root path to scan for source files
   * @returns Complete dependency graph
   * @requirements 20.2
   */
  async build(srcPath: string): Promise<DependencyGraph> {
    // Reset graph
    this.graph = {
      nodes: new Map(),
      lastUpdated: new Date()
    };

    // Scan all file types
    const features = await this.scanFeatures(srcPath);
    const steps = await this.scanSteps(srcPath);
    const pages = await this.scanPages(srcPath);
    const locators = await this.scanLocators(srcPath);

    // Build nodes for all files
    for (const feature of features) {
      this.addNode('feature', feature.path);
    }

    for (const step of steps) {
      this.addNode('step', step.path);
    }

    for (const page of pages) {
      this.addNode('page', page.path);
    }

    for (const locator of locators) {
      this.addNode('locator', locator.path);
    }

    // Build Feature → Step relationships
    for (const feature of features) {
      for (const stepText of feature.steps) {
        const matchingStep = steps.find(s => s.pattern.test(stepText));
        if (matchingStep) {
          this.addDependency(feature.path, matchingStep.path);
        }
      }
    }

    // Build Step → Page relationships
    for (const step of steps) {
      for (const pageImport of step.imports) {
        const matchingPage = pages.find(p => p.path.includes(pageImport));
        if (matchingPage) {
          this.addDependency(step.path, matchingPage.path);
        }
      }
    }

    // Build Page → Locator relationships
    for (const page of pages) {
      for (const locatorRef of page.locatorRefs) {
        const matchingLocator = locators.find(l => l.domain === locatorRef);
        if (matchingLocator) {
          this.addDependency(page.path, matchingLocator.path);
        }
      }
    }

    return this.graph;
  }

  /**
   * Get all tests affected by changed files
   * Traverses dependency graph to find all dependent features
   * 
   * @param changedFiles - List of changed file paths
   * @returns List of affected feature file paths
   * @requirements 20.2, 20.7
   */
  getAffectedTests(changedFiles: string[]): string[] {
    const affectedFeatures = new Set<string>();

    for (const file of changedFiles) {
      const node = this.graph.nodes.get(file);
      if (!node) continue;

      // Traverse up the dependency tree to find affected features
      this.collectAffectedFeatures(file, affectedFeatures);
    }

    return Array.from(affectedFeatures);
  }

  /**
   * Save dependency graph to cache file
   * 
   * @param cachePath - Path to save the graph JSON
   * @requirements 20.2
   */
  async save(cachePath: string): Promise<void> {
    const serialized = {
      nodes: Array.from(this.graph.nodes.entries()),
      lastUpdated: this.graph.lastUpdated.toISOString()
    };

    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(serialized, null, 2));
  }

  /**
   * Load dependency graph from cache file
   * 
   * @param cachePath - Path to load the graph JSON from
   * @returns Loaded dependency graph or null if file doesn't exist
   * @requirements 20.2
   */
  async load(cachePath: string): Promise<DependencyGraph | null> {
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const data = JSON.parse(content);
      this.graph = {
        nodes: new Map(data.nodes),
        lastUpdated: new Date(data.lastUpdated)
      };
      return this.graph;
    } catch {
      return null;
    }
  }

  /**
   * Recursively collect all affected features from a changed file
   */
  private collectAffectedFeatures(filePath: string, affected: Set<string>): void {
    const node = this.graph.nodes.get(filePath);
    if (!node) return;

    if (node.type === 'feature') {
      affected.add(filePath);
      return;
    }

    for (const dependent of node.dependents) {
      this.collectAffectedFeatures(dependent, affected);
    }
  }

  /**
   * Add a node to the dependency graph
   */
  private addNode(type: DependencyNode['type'], filePath: string): void {
    if (!this.graph.nodes.has(filePath)) {
      this.graph.nodes.set(filePath, {
        type,
        path: filePath,
        dependencies: [],
        dependents: []
      });
    }
  }

  /**
   * Add a dependency relationship between two nodes
   */
  private addDependency(from: string, to: string): void {
    const fromNode = this.graph.nodes.get(from);
    const toNode = this.graph.nodes.get(to);

    if (fromNode && toNode) {
      if (!fromNode.dependencies.includes(to)) {
        fromNode.dependencies.push(to);
      }
      if (!toNode.dependents.includes(from)) {
        toNode.dependents.push(from);
      }
    }
  }

  /**
   * Scan for feature files and extract step patterns
   */
  private async scanFeatures(srcPath: string): Promise<FeatureInfo[]> {
    const features: FeatureInfo[] = [];
    const featuresDir = path.join(srcPath, 'features');

    try {
      await fs.access(featuresDir);
    } catch {
      return features;
    }

    const files = await this.findFiles(featuresDir, '.feature');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const steps = this.extractStepsFromFeature(content);
      features.push({ path: file, steps });
    }

    return features;
  }

  /**
   * Extract step patterns from feature file content
   */
  private extractStepsFromFeature(content: string): string[] {
    const steps: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('Given ') ||
        trimmed.startsWith('When ') ||
        trimmed.startsWith('Then ') ||
        trimmed.startsWith('And ') ||
        trimmed.startsWith('But ')
      ) {
        // Remove the keyword and extract the step text
        // Normalize whitespace to single spaces
        const stepText = trimmed
          .replace(/^(Given|When|Then|And|But)\s+/, '')
          .replace(/\s+/g, ' ')
          .trim();
        steps.push(stepText);
      }
    }

    return steps;
  }

  /**
   * Scan for step definition files and extract patterns and imports
   */
  private async scanSteps(srcPath: string): Promise<StepInfo[]> {
    const steps: StepInfo[] = [];
    const stepsDir = path.join(srcPath, 'steps');

    try {
      await fs.access(stepsDir);
    } catch {
      return steps;
    }

    const files = await this.findFiles(stepsDir, '.steps.ts');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const patterns = this.extractStepPatterns(content);
      const imports = this.extractPageImports(content);

      for (const pattern of patterns) {
        steps.push({ path: file, pattern, imports });
      }
    }

    return steps;
  }

  /**
   * Extract step patterns from step definition file
   */
  private extractStepPatterns(content: string): RegExp[] {
    const patterns: RegExp[] = [];
    const stepRegex = /(Given|When|Then|And|But)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = stepRegex.exec(content)) !== null) {
      const pattern = match[2];
      if (!pattern) continue;
      
      // Convert Cucumber expression to regex
      // Replace {string} with .*
      // Replace {int} with \d+
      // Normalize whitespace (multiple spaces to single space pattern)
      const regexPattern = pattern
        .replace(/\{string\}/g, '.*')
        .replace(/\{int\}/g, '\\d+')
        .replace(/\{float\}/g, '[\\d.]+')
        .replace(/\s+/g, '\\s+'); // Match one or more whitespace characters

      try {
        patterns.push(new RegExp(regexPattern));
      } catch {
        // Invalid regex, skip
      }
    }

    return patterns;
  }

  /**
   * Extract page object imports from step definition file
   */
  private extractPageImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+{[^}]*}\s+from\s+['"]\.\.\/pages\/([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath) {
        imports.push(importPath.replace('.js', ''));
      }
    }

    return imports;
  }

  /**
   * Scan for page object files and extract locator references
   */
  private async scanPages(srcPath: string): Promise<PageInfo[]> {
    const pages: PageInfo[] = [];
    const pagesDir = path.join(srcPath, 'pages');

    try {
      await fs.access(pagesDir);
    } catch {
      return pages;
    }

    const files = await this.findFiles(pagesDir, '.ts');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const locatorRefs = this.extractLocatorReferences(content);
      pages.push({ path: file, locatorRefs });
    }

    return pages;
  }

  /**
   * Extract locator domain references from page object file
   */
  private extractLocatorReferences(content: string): string[] {
    const refs: string[] = [];
    const locatorRegex = /this\.locators\.([a-zA-Z]+)\./g;
    let match;

    while ((match = locatorRegex.exec(content)) !== null) {
      const domain = match[1];
      if (domain && !refs.includes(domain)) {
        refs.push(domain);
      }
    }

    return refs;
  }

  /**
   * Scan for locator YAML files
   */
  private async scanLocators(srcPath: string): Promise<LocatorInfo[]> {
    const locators: LocatorInfo[] = [];
    const locatorsDir = path.join(srcPath, 'locators');

    try {
      await fs.access(locatorsDir);
    } catch {
      return locators;
    }

    const files = await this.findFiles(locatorsDir, '.yaml');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const domain = this.extractLocatorDomain(content);
      if (domain) {
        locators.push({ path: file, domain });
      }
    }

    return locators;
  }

  /**
   * Extract domain name from locator YAML file
   */
  private extractLocatorDomain(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.endsWith(':')) {
        return trimmed.slice(0, -1);
      }
    }
    return null;
  }

  /**
   * Recursively find all files with a specific extension
   */
  private async findFiles(dir: string, extension: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files;
  }
}
