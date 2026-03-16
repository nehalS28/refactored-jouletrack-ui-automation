/**
 * Unit tests for generate:domain CLI command.
 * 
 * @module cli/commands/generate-domain.test
 * @requirements 18.1, 18.7, 18.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateDomain } from './generate-domain.js';

describe('generate:domain command', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output-domain');
  const originalCwd = process.cwd();

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

  describe('Complete domain structure generation', () => {
    it('should generate all domain files', () => {
      const domainName = 'billing';

      generateDomain(domainName);

      // Check feature file
      const featurePath = path.join(testOutputDir, 'features', domainName, `${domainName}.feature`);
      expect(fs.existsSync(featurePath)).toBe(true);

      // Check step definitions
      const stepsPath = path.join(testOutputDir, 'src', 'steps', domainName, `${domainName}.steps.ts`);
      expect(fs.existsSync(stepsPath)).toBe(true);

      // Check page object
      const pagePath = path.join(testOutputDir, 'src', 'pages', domainName, `${domainName}-page.ts`);
      expect(fs.existsSync(pagePath)).toBe(true);

      // Check locator YAML
      const locatorPath = path.join(testOutputDir, 'src', 'locators', 'registry', `${domainName}.yaml`);
      expect(fs.existsSync(locatorPath)).toBe(true);
    });

    it('should create domain directories', () => {
      const domainName = 'inventory';

      generateDomain(domainName);

      expect(fs.existsSync(path.join(testOutputDir, 'features', domainName))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'src', 'steps', domainName))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'src', 'pages', domainName))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'src', 'locators', 'registry'))).toBe(true);
    });

    it('should use kebab-case for domain names', () => {
      const domainName = 'UserManagement';

      generateDomain(domainName);

      const featurePath = path.join(testOutputDir, 'features', 'user-management', 'user-management.feature');
      expect(fs.existsSync(featurePath)).toBe(true);
    });

    it('should throw error for empty domain name', () => {
      expect(() => generateDomain('')).toThrow('Domain name cannot be empty');
    });

    it('should throw error for invalid domain name', () => {
      expect(() => generateDomain('domain@#$')).toThrow('Invalid domain name');
    });
  });

  describe('Locator YAML generation', () => {
    it('should generate locator YAML with correct structure', () => {
      const domainName = 'checkout';

      generateDomain(domainName);

      const locatorPath = path.join(testOutputDir, 'src', 'locators', 'registry', `${domainName}.yaml`);
      const content = fs.readFileSync(locatorPath, 'utf-8');
      
      expect(content).toContain(`${domainName}:`);
      expect(content).toContain('selector:');
      expect(content).toContain('strategy:');
      expect(content).toContain('description:');
    });

    it('should include sample locators in YAML', () => {
      const domainName = 'orders';

      generateDomain(domainName);

      const locatorPath = path.join(testOutputDir, 'src', 'locators', 'registry', `${domainName}.yaml`);
      const content = fs.readFileSync(locatorPath, 'utf-8');
      
      expect(content).toContain('mainContainer:');
      expect(content).toContain('actionButton:');
    });
  });

  describe('File consistency', () => {
    it('should use consistent naming across all files', () => {
      const domainName = 'payments';

      generateDomain(domainName);

      const featurePath = path.join(testOutputDir, 'features', domainName, `${domainName}.feature`);
      const stepsPath = path.join(testOutputDir, 'src', 'steps', domainName, `${domainName}.steps.ts`);
      const pagePath = path.join(testOutputDir, 'src', 'pages', domainName, `${domainName}-page.ts`);

      const featureContent = fs.readFileSync(featurePath, 'utf-8');
      const stepsContent = fs.readFileSync(stepsPath, 'utf-8');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');

      // Feature should reference the domain
      expect(featureContent).toContain(`@${domainName}`);

      // Steps should import the page object
      expect(stepsContent).toContain('Page');
      expect(stepsContent).toContain(`pages/${domainName}`);

      // Page should have correct class name
      expect(pageContent).toContain('Page extends BasePage');
    });
  });

  describe('Verbose output', () => {
    it('should log all file creations when verbose is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      generateDomain('test-domain', { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created feature file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created step definitions'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created page object'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created locator registry'));
      
      consoleSpy.mockRestore();
    });

    it('should show summary when verbose is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      generateDomain('test-domain', { verbose: false });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generated domain'));
      
      consoleSpy.mockRestore();
    });
  });
});
