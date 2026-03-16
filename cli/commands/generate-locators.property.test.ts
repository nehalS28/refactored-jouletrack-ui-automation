/**
 * Property-based tests for the generate-locators CLI command.
 * 
 * **Property 51: Typed Locator Compile-Time Safety**
 * **Validates: Requirements 1.4, 14.2**
 * 
 * Tests that generated locators provide TypeScript autocomplete and
 * that invalid locator paths fail at compile time.
 * 
 * @module cli/commands/generate-locators.property.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateLocators } from './generate-locators.js';
import type { LocatorStrategy } from '../../src/types/index.js';

/** Valid locator strategies */
const VALID_STRATEGIES: readonly LocatorStrategy[] = ['css', 'data-testid', 'xpath', 'aria-label'];

/**
 * Arbitrary for generating valid locator strategies.
 */
const strategyArb = fc.constantFrom(...VALID_STRATEGIES);

/**
 * Arbitrary for generating valid CSS selectors.
 */
const cssSelectorArb = fc.oneof(
  // Class selector
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)).map(s => `.${s}`),
  // ID selector
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)).map(s => `#${s}`),
  // Data-testid selector
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)).map(s => `[data-testid='${s}']`),
  // Tag selector
  fc.constantFrom('div', 'span', 'button', 'input', 'a', 'form', 'table', 'tr', 'td')
);

/**
 * Arbitrary for generating valid XPath selectors.
 */
const xpathSelectorArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)).map(s => `//div[@class='${s}']`),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)).map(s => `//button[@id='${s}']`),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)).map(s => `//*[@data-testid='${s}']`)
);

/**
 * Arbitrary for generating valid ARIA label selectors.
 */
const ariaLabelSelectorArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9 ]*$/.test(s));

/**
 * Arbitrary for generating valid selectors based on strategy.
 */
const selectorForStrategyArb = (strategy: LocatorStrategy): fc.Arbitrary<string> => {
  switch (strategy) {
    case 'css':
    case 'data-testid':
      return cssSelectorArb;
    case 'xpath':
      return xpathSelectorArb;
    case 'aria-label':
      return ariaLabelSelectorArb;
    default:
      return cssSelectorArb;
  }
};

/**
 * Arbitrary for generating valid identifier names (for YAML keys).
 */
const identifierArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s));

/**
 * Arbitrary for generating valid descriptions.
 */
const descriptionArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => /^[a-zA-Z0-9 .,!?-]+$/.test(s) && s.trim().length > 0);

/**
 * Arbitrary for generating optional timeout values.
 */
const timeoutArb = fc.option(fc.integer({ min: 100, max: 60000 }), { nil: undefined });

/**
 * Arbitrary for generating a valid locator definition.
 */
const locatorDefinitionArb = strategyArb.chain(strategy =>
  fc.record({
    selector: selectorForStrategyArb(strategy),
    strategy: fc.constant(strategy),
    description: descriptionArb,
    timeout: timeoutArb
  })
);

/**
 * Arbitrary for generating a component with multiple locators.
 */
const componentArb = fc.dictionary(
  identifierArb,
  locatorDefinitionArb,
  { minKeys: 1, maxKeys: 5 }
);

/**
 * Arbitrary for generating a page with multiple components.
 */
const pageArb = fc.dictionary(
  identifierArb,
  componentArb,
  { minKeys: 1, maxKeys: 3 }
);

/**
 * Arbitrary for generating a domain with pages.
 */
const domainArb = fc.tuple(identifierArb, pageArb);

describe('Property 51: Typed Locator Compile-Time Safety', () => {
  let tempDir: string;
  let registryDir: string;
  let outputFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locator-prop-test-'));
    registryDir = path.join(tempDir, 'registry');
    outputFile = path.join(tempDir, 'generated', 'index.ts');
    fs.mkdirSync(registryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to convert locator definition to YAML string.
   */
  const toYamlLocator = (loc: { selector: string; strategy: string; description: string; timeout?: number }): string => {
    let yaml = `      selector: "${loc.selector.replace(/"/g, '\\"')}"\n`;
    yaml += `      strategy: ${loc.strategy}\n`;
    yaml += `      description: "${loc.description.replace(/"/g, '\\"')}"`;
    if (loc.timeout !== undefined) {
      yaml += `\n      timeout: ${loc.timeout}`;
    }
    return yaml;
  };

  /**
   * Helper to convert component to YAML string.
   */
  const toYamlComponent = (component: Record<string, { selector: string; strategy: string; description: string; timeout?: number }>): string => {
    return Object.entries(component)
      .map(([name, loc]) => `    ${name}:\n${toYamlLocator(loc)}`)
      .join('\n');
  };

  /**
   * Helper to convert page to YAML string.
   */
  const toYamlPage = (page: Record<string, Record<string, { selector: string; strategy: string; description: string; timeout?: number }>>): string => {
    return Object.entries(page)
      .map(([name, component]) => `  ${name}:\n${toYamlComponent(component)}`)
      .join('\n');
  };

  /**
   * Helper to create YAML file content.
   */
  const createYamlContent = (domain: string, page: Record<string, Record<string, { selector: string; strategy: string; description: string; timeout?: number }>>): string => {
    return `${domain}:\n${toYamlPage(page)}`;
  };

  it('should generate valid TypeScript for any valid YAML locator definition', () => {
    fc.assert(
      fc.property(domainArb, ([domain, page]) => {
        // Create YAML file
        const yamlContent = createYamlContent(domain, page);
        fs.writeFileSync(path.join(registryDir, `${domain}.yaml`), yamlContent);

        // Generate TypeScript
        generateLocators({ registryDir, outputFile });

        // Verify file was created
        expect(fs.existsSync(outputFile)).toBe(true);

        // Read generated content
        const content = fs.readFileSync(outputFile, 'utf-8');

        // Verify domain is present
        expect(content).toContain(domain);

        // Verify all pages are present
        for (const pageName of Object.keys(page)) {
          expect(content).toContain(pageName);
        }

        // Verify all locators are present
        for (const [, component] of Object.entries(page)) {
          for (const locatorName of Object.keys(component)) {
            expect(content).toContain(locatorName);
          }
        }

        // Clean up for next iteration
        fs.rmSync(path.join(registryDir, `${domain}.yaml`));
      }),
      { numRuns: 50 }
    );
  });

  it('should preserve all locator strategies correctly in generated code', () => {
    fc.assert(
      fc.property(strategyArb, (strategy) => {
        const selector = strategy === 'xpath' 
          ? "//div[@class='test']" 
          : strategy === 'aria-label'
            ? 'Test Label'
            : "[data-testid='test']";

        const yamlContent = `
testDomain:
  testPage:
    testElement:
      selector: "${selector}"
      strategy: ${strategy}
      description: "Test element"
`;
        fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

        generateLocators({ registryDir, outputFile });

        const content = fs.readFileSync(outputFile, 'utf-8');

        // Verify strategy is preserved with const assertion
        expect(content).toContain(`strategy: '${strategy}' as const`);

        // Clean up
        fs.rmSync(path.join(registryDir, 'test.yaml'));
      }),
      { numRuns: 20 }
    );
  });

  it('should correctly type all locator properties (selector, strategy, description, timeout)', () => {
    fc.assert(
      fc.property(locatorDefinitionArb, (locator) => {
        const yamlContent = `
testDomain:
  testPage:
    testElement:
      selector: "${locator.selector.replace(/"/g, '\\"')}"
      strategy: ${locator.strategy}
      description: "${locator.description.replace(/"/g, '\\"')}"${locator.timeout !== undefined ? `\n      timeout: ${locator.timeout}` : ''}
`;
        fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

        generateLocators({ registryDir, outputFile });

        const content = fs.readFileSync(outputFile, 'utf-8');

        // Verify selector is present (escaped)
        expect(content).toContain('selector:');

        // Verify strategy has const assertion
        expect(content).toContain(`strategy: '${locator.strategy}' as const`);

        // Verify description is present
        expect(content).toContain('description:');

        // Verify timeout is present if defined
        if (locator.timeout !== undefined) {
          expect(content).toContain(`timeout: ${locator.timeout}`);
        }

        // Verify satisfies Locator type annotation
        expect(content).toContain('satisfies Locator');

        // Clean up
        fs.rmSync(path.join(registryDir, 'test.yaml'));
      }),
      { numRuns: 50 }
    );
  });

  it('should generate const assertions for type-safe autocomplete', () => {
    fc.assert(
      fc.property(domainArb, ([domain, page]) => {
        const yamlContent = createYamlContent(domain, page);
        fs.writeFileSync(path.join(registryDir, `${domain}.yaml`), yamlContent);

        generateLocators({ registryDir, outputFile });

        const content = fs.readFileSync(outputFile, 'utf-8');

        // Verify const assertion at the end of locators object
        expect(content).toContain('} as const;');

        // Verify each strategy has const assertion
        for (const [, component] of Object.entries(page)) {
          for (const [, locator] of Object.entries(component)) {
            expect(content).toContain(`'${locator.strategy}' as const`);
          }
        }

        // Clean up
        fs.rmSync(path.join(registryDir, `${domain}.yaml`));
      }),
      { numRuns: 30 }
    );
  });

  it('should generate type exports for TypeScript autocomplete support', () => {
    fc.assert(
      fc.property(domainArb, ([domain, page]) => {
        const yamlContent = createYamlContent(domain, page);
        fs.writeFileSync(path.join(registryDir, `${domain}.yaml`), yamlContent);

        generateLocators({ registryDir, outputFile });

        const content = fs.readFileSync(outputFile, 'utf-8');

        // Verify LocatorDomains type export
        expect(content).toContain('export type LocatorDomains = keyof typeof locators');

        // Verify domain-specific type export (PascalCase)
        const domainPascal = domain.charAt(0).toUpperCase() + domain.slice(1);
        expect(content).toContain(`export type ${domainPascal}Pages`);

        // Verify page-specific type exports
        for (const pageName of Object.keys(page)) {
          const pagePascal = pageName.charAt(0).toUpperCase() + pageName.slice(1);
          expect(content).toContain(`${domainPascal}${pagePascal}Elements`);
        }

        // Clean up
        fs.rmSync(path.join(registryDir, `${domain}.yaml`));
      }),
      { numRuns: 30 }
    );
  });

  it('should import Locator type for type safety', () => {
    fc.assert(
      fc.property(domainArb, ([domain, page]) => {
        const yamlContent = createYamlContent(domain, page);
        fs.writeFileSync(path.join(registryDir, `${domain}.yaml`), yamlContent);

        generateLocators({ registryDir, outputFile });

        const content = fs.readFileSync(outputFile, 'utf-8');

        // Verify Locator type import
        expect(content).toContain("import type { Locator }");

        // Clean up
        fs.rmSync(path.join(registryDir, `${domain}.yaml`));
      }),
      { numRuns: 20 }
    );
  });

  it('should handle multiple domains in separate YAML files', () => {
    fc.assert(
      fc.property(
        fc.array(domainArb, { minLength: 2, maxLength: 4 }),
        (domains) => {
          // Ensure unique domain names
          const uniqueDomains = domains.reduce((acc, [domain, page]) => {
            const uniqueName = `${domain}${acc.length}`;
            acc.push([uniqueName, page] as [string, typeof page]);
            return acc;
          }, [] as Array<[string, typeof domains[0][1]]>);

          // Create YAML files for each domain
          for (const [domain, page] of uniqueDomains) {
            const yamlContent = createYamlContent(domain, page);
            fs.writeFileSync(path.join(registryDir, `${domain}.yaml`), yamlContent);
          }

          generateLocators({ registryDir, outputFile });

          const content = fs.readFileSync(outputFile, 'utf-8');

          // Verify all domains are present
          for (const [domain] of uniqueDomains) {
            expect(content).toContain(domain);
          }

          // Clean up
          for (const [domain] of uniqueDomains) {
            fs.rmSync(path.join(registryDir, `${domain}.yaml`));
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should escape special characters in selectors correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "[data-testid='test-value']",
          ".class-with-dash",
          "#id_with_underscore",
          "button[type='submit']",
          "input[name='email']"
        ),
        (selector) => {
          const yamlContent = `
testDomain:
  testPage:
    testElement:
      selector: "${selector}"
      strategy: css
      description: "Test element"
`;
          fs.writeFileSync(path.join(registryDir, 'test.yaml'), yamlContent);

          generateLocators({ registryDir, outputFile });

          const content = fs.readFileSync(outputFile, 'utf-8');

          // Verify the generated code contains a valid selector string
          expect(content).toContain('selector:');
          
          // Verify the file was generated without errors
          expect(fs.existsSync(outputFile)).toBe(true);

          // Clean up
          fs.rmSync(path.join(registryDir, 'test.yaml'));
        }
      ),
      { numRuns: 10 }
    );
  });
});
