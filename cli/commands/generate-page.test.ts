/**
 * Unit tests for generate:page CLI command.
 * 
 * @module cli/commands/generate-page.test
 * @requirements 18.1, 18.7, 18.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generatePage } from './generate-page.js';

describe('generate:page command', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output-page');
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

  describe('Page object generation', () => {
    it('should generate page object with correct structure', () => {
      const pageName = 'dashboard';
      const domain = 'dashboard';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('export class');
      expect(content).toContain('extends BasePage');
      expect(content).toContain('constructor(context: TestContext)');
    });

    it('should generate page object with correct imports', () => {
      const pageName = 'profile';
      const domain = 'dashboard';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain("import { BasePage } from '../base-page.js'");
      expect(content).toContain("import type { TestContext } from '../../types/context.types.js'");
    });

    it('should generate page object with pageName property', () => {
      const pageName = 'settings';
      const domain = 'settings';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain('readonly pageName =');
      expect(content).toContain(`'${pageName}-page'`);
    });

    it('should generate page object with pageUrl property', () => {
      const pageName = 'login';
      const domain = 'authentication';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain('protected get pageUrl(): string');
      expect(content).toContain(`'/${pageName}'`);
    });

    it('should create domain directory if it does not exist', () => {
      const pageName = 'new-page';
      const domain = 'new-domain';

      generatePage(pageName, domain);

      const domainPath = path.join(testOutputDir, 'src', 'pages', domain);
      expect(fs.existsSync(domainPath)).toBe(true);
    });

    it('should use kebab-case for page file names', () => {
      const pageName = 'UserProfile';
      const domain = 'dashboard';

      generatePage(pageName, domain);

      const expectedPath = path.join(testOutputDir, 'src', 'pages', domain, 'user-profile-page.ts');
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('should use PascalCase for class names', () => {
      const pageName = 'user-settings';
      const domain = 'settings';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain('export class UserSettingsPage');
    });

    it('should throw error for empty page name', () => {
      expect(() => generatePage('', 'dashboard')).toThrow('Page name cannot be empty');
    });

    it('should throw error for invalid page name with special characters', () => {
      expect(() => generatePage('page@#$', 'dashboard')).toThrow('Invalid page name');
    });
  });

  describe('Page object methods', () => {
    it('should generate placeholder action methods', () => {
      const pageName = 'checkout';
      const domain = 'ecommerce';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain('async ');
      expect(content).toContain('Promise<this>');
    });

    it('should include JSDoc comments', () => {
      const pageName = 'reports';
      const domain = 'reports';

      generatePage(pageName, domain);

      const pagePath = path.join(testOutputDir, 'src', 'pages', domain, `${pageName}-page.ts`);
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain('/**');
      expect(content).toContain('* @module');
      expect(content).toContain('* @requirements');
    });
  });

  describe('Verbose output', () => {
    it('should log file creation when verbose is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      generatePage('test-page', 'test-domain', { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created page object'));
      
      consoleSpy.mockRestore();
    });

    it('should not log verbose details when verbose is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      generatePage('test-page', 'test-domain', { verbose: false });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Created page object'));
      
      consoleSpy.mockRestore();
    });
  });
});
