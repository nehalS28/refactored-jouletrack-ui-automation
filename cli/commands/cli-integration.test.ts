/**
 * Integration tests for CLI commands.
 * Tests the complete workflow of generating domain structures.
 * 
 * @module cli/commands/cli-integration.test
 * @requirements 18.1, 18.2, 18.7, 18.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateFeature } from './generate-feature.js';
import { generatePage } from './generate-page.js';
import { generateDomain } from './generate-domain.js';

describe('CLI Integration Tests', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output-integration');

  beforeEach(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    
    // Mock process.cwd to use test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testOutputDir);
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    vi.restoreAllMocks();
  });

  describe('Complete workflow: generate:domain', () => {
    it('should generate a complete working domain structure', () => {
      const domainName = 'shopping-cart';

      generateDomain(domainName);

      // Verify all files exist
      const featurePath = path.join(testOutputDir, 'features', domainName, `${domainName}.feature`);
      const stepsPath = path.join(testOutputDir, 'src', 'steps', domainName, `${domainName}.steps.ts`);
      const pagePath = path.join(testOutputDir, 'src', 'pages', domainName, `${domainName}-page.ts`);
      const locatorPath = path.join(testOutputDir, 'src', 'locators', 'registry', `${domainName}.yaml`);

      expect(fs.existsSync(featurePath)).toBe(true);
      expect(fs.existsSync(stepsPath)).toBe(true);
      expect(fs.existsSync(pagePath)).toBe(true);
      expect(fs.existsSync(locatorPath)).toBe(true);

      // Verify content consistency
      const featureContent = fs.readFileSync(featurePath, 'utf-8');
      const stepsContent = fs.readFileSync(stepsPath, 'utf-8');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');
      const locatorContent = fs.readFileSync(locatorPath, 'utf-8');

      // Feature should have proper Gherkin structure
      expect(featureContent).toContain('Feature:');
      expect(featureContent).toContain('Scenario:');
      expect(featureContent).toContain(`@${domainName}`);

      // Steps should import page object
      expect(stepsContent).toContain('import');
      expect(stepsContent).toContain('Page');
      expect(stepsContent).toContain('Given(');
      expect(stepsContent).toContain('When(');
      expect(stepsContent).toContain('Then(');

      // Page should extend BasePage
      expect(pageContent).toContain('extends BasePage');
      expect(pageContent).toContain('constructor(context: TestContext)');
      expect(pageContent).toContain('readonly pageName');

      // Locator should have YAML structure
      expect(locatorContent).toContain(`${domainName}:`);
      expect(locatorContent).toContain('selector:');
      expect(locatorContent).toContain('strategy:');
    });

    it('should generate files that reference each other correctly', () => {
      const domainName = 'user-profile';

      generateDomain(domainName);

      const stepsPath = path.join(testOutputDir, 'src', 'steps', domainName, `${domainName}.steps.ts`);
      const pagePath = path.join(testOutputDir, 'src', 'pages', domainName, `${domainName}-page.ts`);

      const stepsContent = fs.readFileSync(stepsPath, 'utf-8');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');

      // Steps should import the correct page object
      const pascalName = domainName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');
      
      expect(stepsContent).toContain(`${pascalName}Page`);
      expect(stepsContent).toContain(`pages/${domainName}`);

      // Page should have matching class name
      expect(pageContent).toContain(`export class ${pascalName}Page`);
    });
  });

  describe('Incremental workflow: generate:feature + generate:page', () => {
    it('should allow generating feature and page separately', () => {
      const featureName = 'product-search';
      const domain = 'catalog';

      // Generate feature first
      generateFeature(featureName, domain);

      const featurePath = path.join(testOutputDir, 'features', domain, `${featureName}.feature`);
      const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, `${featureName}.steps.ts`);

      expect(fs.existsSync(featurePath)).toBe(true);
      expect(fs.existsSync(stepsPath)).toBe(true);

      // Generate page separately
      generatePage(featureName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${featureName}-page.ts`);
      expect(fs.existsSync(pagePath)).toBe(true);

      // Verify they work together
      const stepsContent = fs.readFileSync(stepsPath, 'utf-8');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');

      const pascalName = featureName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');

      expect(stepsContent).toContain(`${pascalName}Page`);
      expect(pageContent).toContain(`export class ${pascalName}Page`);
    });
  });

  describe('Multiple domains', () => {
    it('should generate multiple domains without conflicts', () => {
      const domains = ['authentication', 'dashboard', 'settings'];

      domains.forEach(domain => {
        generateDomain(domain);
      });

      // Verify all domains exist
      domains.forEach(domain => {
        const featurePath = path.join(testOutputDir, 'features', domain, `${domain}.feature`);
        const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, `${domain}.steps.ts`);
        const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${domain}-page.ts`);
        const locatorPath = path.join(testOutputDir, 'src', 'locators', 'registry', `${domain}.yaml`);

        expect(fs.existsSync(featurePath)).toBe(true);
        expect(fs.existsSync(stepsPath)).toBe(true);
        expect(fs.existsSync(pagePath)).toBe(true);
        expect(fs.existsSync(locatorPath)).toBe(true);
      });

      // Verify locator files are separate
      const locatorFiles = fs.readdirSync(path.join(testOutputDir, 'src', 'locators', 'registry'));
      expect(locatorFiles).toHaveLength(domains.length);
      expect(locatorFiles).toContain('authentication.yaml');
      expect(locatorFiles).toContain('dashboard.yaml');
      expect(locatorFiles).toContain('settings.yaml');
    });
  });

  describe('File compilation readiness', () => {
    it('should generate TypeScript files with valid syntax', () => {
      const domainName = 'orders';

      generateDomain(domainName);

      const stepsPath = path.join(testOutputDir, 'src', 'steps', domainName, `${domainName}.steps.ts`);
      const pagePath = path.join(testOutputDir, 'src', 'pages', domainName, `${domainName}-page.ts`);

      const stepsContent = fs.readFileSync(stepsPath, 'utf-8');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');

      // Check for basic TypeScript syntax validity
      expect(stepsContent).toMatch(/import.*from/);
      expect(stepsContent).toMatch(/function.*\{/);
      expect(stepsContent).not.toContain('undefined');

      expect(pageContent).toMatch(/export class/);
      expect(pageContent).toMatch(/constructor\(/);
      expect(pageContent).not.toContain('undefined');
    });

    it('should generate feature files with valid Gherkin syntax', () => {
      const domainName = 'reports';

      generateDomain(domainName);

      const featurePath = path.join(testOutputDir, 'features', domainName, `${domainName}.feature`);
      const content = fs.readFileSync(featurePath, 'utf-8');

      // Check Gherkin keywords are present
      expect(content).toMatch(/^@/m); // Tags
      expect(content).toMatch(/^Feature:/m);
      expect(content).toMatch(/^  Background:/m);
      expect(content).toMatch(/^  Scenario:/m);
      expect(content).toMatch(/^    Given /m);
      expect(content).toMatch(/^    When /m);
      expect(content).toMatch(/^    Then /m);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid domain names gracefully', () => {
      expect(() => generateDomain('')).toThrow();
      expect(() => generateDomain('invalid@domain')).toThrow();
    });

    it('should handle invalid feature names gracefully', () => {
      expect(() => generateFeature('', 'domain')).toThrow();
      expect(() => generateFeature('invalid@feature', 'domain')).toThrow();
    });

    it('should handle invalid page names gracefully', () => {
      expect(() => generatePage('', 'domain')).toThrow();
      expect(() => generatePage('invalid@page', 'domain')).toThrow();
    });
  });
});
