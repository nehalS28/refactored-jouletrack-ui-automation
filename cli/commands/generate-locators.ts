/**
 * CLI command for generating typed locators from YAML registry files.
 * 
 * @module cli/commands/generate-locators
 * @requirements 1.2, 1.4, 14.2
 * 
 * This command reads all YAML files from src/locators/registry/,
 * parses them, and generates TypeScript code with const assertions
 * for type-safe locator access.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import type { 
  YamlLocatorDefinition, 
  YamlComponentDefinition, 
  YamlPageDefinition,
  LocatorStrategy 
} from '../../src/types/index.js';

/** Valid locator strategies for validation */
const VALID_STRATEGIES: readonly LocatorStrategy[] = ['css', 'data-testid', 'xpath', 'aria-label'];

/** Result of parsing a YAML file */
interface ParsedYamlFile {
  readonly domain: string;
  readonly pages: YamlPageDefinition;
}

/** Validation error for locator definitions */
interface ValidationError {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

/**
 * Validates a locator definition has all required fields.
 */
function validateLocator(
  locator: unknown,
  filePath: string,
  locatorPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!locator || typeof locator !== 'object') {
    errors.push({ file: filePath, path: locatorPath, message: 'Locator must be an object' });
    return errors;
  }

  const loc = locator as Record<string, unknown>;
  const selector = loc['selector'];
  const strategy = loc['strategy'];
  const description = loc['description'];
  const timeout = loc['timeout'];
  
  if (typeof selector !== 'string' || selector.trim() === '') {
    errors.push({ file: filePath, path: locatorPath, message: 'Missing or invalid "selector" field' });
  }
  
  if (!VALID_STRATEGIES.includes(strategy as LocatorStrategy)) {
    errors.push({ 
      file: filePath, 
      path: locatorPath, 
      message: `Invalid strategy "${String(strategy)}". Must be one of: ${VALID_STRATEGIES.join(', ')}` 
    });
  }
  
  if (typeof description !== 'string' || description.trim() === '') {
    errors.push({ file: filePath, path: locatorPath, message: 'Missing or invalid "description" field' });
  }
  
  if (timeout !== undefined && (typeof timeout !== 'number' || timeout < 0)) {
    errors.push({ file: filePath, path: locatorPath, message: 'Invalid "timeout" field - must be a positive number' });
  }
  
  return errors;
}

/**
 * Reads and parses all YAML files from the registry directory.
 */
function readYamlFiles(registryDir: string): { files: ParsedYamlFile[]; errors: ValidationError[] } {
  const files: ParsedYamlFile[] = [];
  const errors: ValidationError[] = [];
  
  if (!fs.existsSync(registryDir)) {
    throw new Error(`Registry directory not found: ${registryDir}`);
  }
  
  const yamlFiles = fs.readdirSync(registryDir)
    .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
    .sort();
  
  if (yamlFiles.length === 0) {
    throw new Error(`No YAML files found in: ${registryDir}`);
  }
  
  for (const fileName of yamlFiles) {
    const filePath = path.join(registryDir, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const parsed = parseYaml(content) as Record<string, YamlPageDefinition>;
      
      // Each YAML file should have a single top-level key (the domain name)
      const domains = Object.keys(parsed);
      
      for (const domain of domains) {
        const pages = parsed[domain];
        if (!pages) continue;
        
        // Validate all locators in this domain
        for (const [pageName, components] of Object.entries(pages)) {
          if (!components) continue;
          for (const [componentName, locator] of Object.entries(components as YamlComponentDefinition)) {
            const locatorPath = `${domain}.${pageName}.${componentName}`;
            const locatorErrors = validateLocator(locator, fileName, locatorPath);
            errors.push(...locatorErrors);
          }
        }
        
        files.push({ domain, pages });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown parse error';
      errors.push({ file: fileName, path: '', message: `YAML parse error: ${message}` });
    }
  }
  
  return { files, errors };
}

/**
 * Escapes a string for use in TypeScript code.
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Generates TypeScript code for a single locator.
 */
function generateLocatorCode(locator: YamlLocatorDefinition, indent: string): string {
  const lines: string[] = [
    `${indent}{`,
    `${indent}  selector: '${escapeString(locator.selector)}',`,
    `${indent}  strategy: '${locator.strategy}' as const,`,
    `${indent}  description: '${escapeString(locator.description)}'`,
  ];
  
  if (locator.timeout !== undefined) {
    // Insert timeout before the closing brace
    lines[lines.length - 1] = `${indent}  description: '${escapeString(locator.description)}',`;
    lines.push(`${indent}  timeout: ${locator.timeout}`);
  }
  
  lines.push(`${indent}} satisfies Locator`);
  
  return lines.join('\n');
}

/**
 * Generates TypeScript code for a component (collection of locators).
 */
function generateComponentCode(
  component: YamlComponentDefinition, 
  indent: string
): string {
  const entries = Object.entries(component);
  const lines: string[] = ['{'];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const [name, locator] = entry;
    const isLast = i === entries.length - 1;
    const locatorCode = generateLocatorCode(locator, indent + '  ');
    lines.push(`${indent}  ${name}: ${locatorCode.trimStart()}${isLast ? '' : ','}`);
  }
  
  lines.push(`${indent}}`);
  return lines.join('\n');
}

/**
 * Generates TypeScript code for a page (collection of components).
 */
function generatePageCode(page: YamlPageDefinition, indent: string): string {
  const entries = Object.entries(page);
  const lines: string[] = ['{'];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const [name, component] = entry;
    const isLast = i === entries.length - 1;
    const componentCode = generateComponentCode(component, indent + '  ');
    lines.push(`${indent}  ${name}: ${componentCode.trimStart()}${isLast ? '' : ','}`);
  }
  
  lines.push(`${indent}}`);
  return lines.join('\n');
}

/**
 * Generates type exports for autocomplete support.
 */
function generateTypeExports(files: ParsedYamlFile[]): string {
  const lines: string[] = [
    '',
    '// Type exports for autocomplete',
    'export type LocatorDomains = keyof typeof locators;',
  ];
  
  for (const { domain, pages } of files) {
    const domainPascal = domain.charAt(0).toUpperCase() + domain.slice(1);
    lines.push(`export type ${domainPascal}Pages = keyof typeof locators.${domain};`);
    
    for (const pageName of Object.keys(pages)) {
      const pagePascal = pageName.charAt(0).toUpperCase() + pageName.slice(1);
      lines.push(
        `export type ${domainPascal}${pagePascal}Elements = keyof typeof locators.${domain}.${pageName};`
      );
    }
  }
  
  return lines.join('\n');
}

/**
 * Generates the complete TypeScript file content.
 */
function generateTypeScriptFile(files: ParsedYamlFile[]): string {
  const timestamp = new Date().toISOString();
  const header = `// src/locators/generated/index.ts (AUTO-GENERATED - DO NOT EDIT)
// Generated by: cli generate:locators
// Generated at: ${timestamp}
// Source: src/locators/registry/*.yaml

import type { Locator } from '../../types/index.js';

export const locators = {`;

  const domainEntries: string[] = [];
  
  for (const { domain, pages } of files) {
    const pageCode = generatePageCode(pages, '  ');
    domainEntries.push(`  ${domain}: ${pageCode.trimStart()}`);
  }
  
  const body = domainEntries.join(',\n');
  const footer = '} as const;';
  const typeExports = generateTypeExports(files);
  
  return `${header}\n${body}\n${footer}\n${typeExports}\n`;
}

/**
 * Main function to generate locators.
 */
export function generateLocators(options: { 
  registryDir: string; 
  outputFile: string;
  verbose?: boolean;
}): void {
  const { registryDir, outputFile, verbose } = options;
  
  if (verbose) {
    console.log(`Reading YAML files from: ${registryDir}`);
  }
  
  const { files, errors } = readYamlFiles(registryDir);
  
  if (errors.length > 0) {
    console.error('\nValidation errors found:');
    for (const error of errors) {
      console.error(`  ${error.file}${error.path ? ` (${error.path})` : ''}: ${error.message}`);
    }
    throw new Error(`Found ${errors.length} validation error(s)`);
  }
  
  if (verbose) {
    console.log(`Found ${files.length} domain(s):`);
    for (const file of files) {
      const pageCount = Object.keys(file.pages).length;
      const locatorCount = Object.values(file.pages)
        .reduce((sum, page) => sum + Object.keys(page).length, 0);
      console.log(`  - ${file.domain}: ${pageCount} page(s), ${locatorCount} locator(s)`);
    }
  }
  
  const content = generateTypeScriptFile(files);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, content, 'utf-8');
  
  console.log(`✓ Generated typed locators: ${outputFile}`);
  
  // Summary
  const totalLocators = files.reduce((sum, file) => 
    sum + Object.values(file.pages).reduce((s, page) => s + Object.keys(page).length, 0), 0
  );
  console.log(`  ${files.length} domain(s), ${totalLocators} locator(s)`);
}

/**
 * Creates the generate:locators command for the CLI.
 */
export function createGenerateLocatorsCommand(): Command {
  const command = new Command('generate:locators')
    .description('Generate typed TypeScript locators from YAML registry files')
    .option(
      '-r, --registry <path>',
      'Path to locator registry directory',
      'src/locators/registry'
    )
    .option(
      '-o, --output <path>',
      'Output file path',
      'src/locators/generated/index.ts'
    )
    .option('-v, --verbose', 'Enable verbose output')
    .action((options) => {
      try {
        const cwd = process.cwd();
        const registryDir = path.resolve(cwd, options.registry);
        const outputFile = path.resolve(cwd, options.output);
        
        generateLocators({
          registryDir,
          outputFile,
          verbose: options.verbose,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`\n✗ Error: ${message}`);
        process.exit(1);
      }
    });
  
  return command;
}
