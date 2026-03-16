/**
 * Unit tests for the generate-locators CLI command.
 * 
 * @module cli/commands/generate-locators.test
 * @requirements 1.2, 1.4, 14.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateLocators } from './generate-locators.js';

describe('generate-locators command', () => {
  let tempDir: string;
  let registryDir: string;
  let outputFile: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locator-test-'));
    registryDir = path.join(tempDir, 'registry');
    outputFile = path.join(tempDir, 'generated', 'index.ts');
    fs.mkdirSync(registryDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('YAML parsing', () => {
    it('should parse valid YAML files and generate TypeScript', () => {
      // Create a valid YAML file
      const yamlContent = `
authentication:
  loginForm:
    usernameInput:
      selector: "[data-testid='username']"
      strategy: data-testid
      description: "Username input field"
`;
      fs.writeFileSync(path.join(registryDir, 'auth.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      expect(fs.existsSync(outputFile)).toBe(true);
      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('authentication');
      expect(content).toContain('loginForm');
      expect(content).toContain('usernameInput');
      expect(content).toContain("selector: '[data-testid=\\'username\\']'");
      expect(content).toContain("strategy: 'data-testid' as const");
    });

    it('should handle multiple YAML files', () => {
      const authYaml = `
authentication:
  login:
    button:
      selector: "#login-btn"
      strategy: css
      description: "Login button"
`;
      const dashYaml = `
dashboard:
  header:
    logo:
      selector: "[data-testid='logo']"
      strategy: data-testid
      description: "Dashboard logo"
`;
      fs.writeFileSync(path.join(registryDir, 'auth.yaml'), authYaml);
      fs.writeFileSync(path.join(registryDir, 'dashboard.yaml'), dashYaml);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('authentication');
      expect(content).toContain('dashboard');
    });

    it('should handle locators with optional timeout', () => {
      const yamlContent = `
test:
  page:
    slowElement:
      selector: ".slow"
      strategy: css
      description: "Slow loading element"
      timeout: 10000
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('timeout: 10000');
    });
  });

  describe('validation', () => {
    it('should throw error for missing selector', () => {
      const yamlContent = `
test:
  page:
    element:
      strategy: css
      description: "Missing selector"
`;
      fs.writeFileSync(path.join(registryDir, 'invalid.yaml'), yamlContent);

      expect(() => generateLocators({ registryDir, outputFile }))
        .toThrow('validation error');
    });

    it('should throw error for invalid strategy', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "#test"
      strategy: invalid-strategy
      description: "Invalid strategy"
`;
      fs.writeFileSync(path.join(registryDir, 'invalid.yaml'), yamlContent);

      expect(() => generateLocators({ registryDir, outputFile }))
        .toThrow('validation error');
    });

    it('should throw error for missing description', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "#test"
      strategy: css
`;
      fs.writeFileSync(path.join(registryDir, 'invalid.yaml'), yamlContent);

      expect(() => generateLocators({ registryDir, outputFile }))
        .toThrow('validation error');
    });

    it('should throw error for invalid timeout', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "#test"
      strategy: css
      description: "Test element"
      timeout: -100
`;
      fs.writeFileSync(path.join(registryDir, 'invalid.yaml'), yamlContent);

      expect(() => generateLocators({ registryDir, outputFile }))
        .toThrow('validation error');
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent registry directory', () => {
      const nonExistentDir = path.join(tempDir, 'non-existent');

      expect(() => generateLocators({ registryDir: nonExistentDir, outputFile }))
        .toThrow('Registry directory not found');
    });

    it('should throw error for empty registry directory', () => {
      // Registry dir exists but has no YAML files
      expect(() => generateLocators({ registryDir, outputFile }))
        .toThrow('No YAML files found');
    });
  });

  describe('generated output', () => {
    it('should include AUTO-GENERATED header', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "#test"
      strategy: css
      description: "Test element"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('AUTO-GENERATED - DO NOT EDIT');
      expect(content).toContain('Generated by: cli generate:locators');
    });

    it('should include Locator type import', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "#test"
      strategy: css
      description: "Test element"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain("import type { Locator }");
    });

    it('should use const assertions', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "#test"
      strategy: css
      description: "Test element"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('} as const;');
      expect(content).toContain("'css' as const");
    });

    it('should generate type exports for autocomplete', () => {
      const yamlContent = `
authentication:
  loginForm:
    button:
      selector: "#btn"
      strategy: css
      description: "Button"
`;
      fs.writeFileSync(path.join(registryDir, 'auth.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('export type LocatorDomains');
      expect(content).toContain('export type AuthenticationPages');
      expect(content).toContain('export type AuthenticationLoginFormElements');
    });

    it('should escape special characters in selectors', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "[data-testid='test's value']"
      strategy: css
      description: "Element with quote"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain("\\'");
    });
  });

  describe('all locator strategies', () => {
    it('should support css strategy', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: ".my-class"
      strategy: css
      description: "CSS selector"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain("strategy: 'css' as const");
    });

    it('should support data-testid strategy', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "[data-testid='my-element']"
      strategy: data-testid
      description: "Data testid selector"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain("strategy: 'data-testid' as const");
    });

    it('should support xpath strategy', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "//div[@class='test']"
      strategy: xpath
      description: "XPath selector"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain("strategy: 'xpath' as const");
    });

    it('should support aria-label strategy', () => {
      const yamlContent = `
test:
  page:
    element:
      selector: "Submit Form"
      strategy: aria-label
      description: "ARIA label selector"
`;
      fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

      generateLocators({ registryDir, outputFile });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain("strategy: 'aria-label' as const");
    });
  });
});
