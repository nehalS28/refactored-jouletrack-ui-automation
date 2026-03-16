/**
 * CLI command for generating complete domain structure.
 *
 * @module cli/commands/generate-domain
 * @requirements 18.1, 18.7, 18.8
 */
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Converts a string to kebab-case.
 */
function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}
/**
 * Converts a string to PascalCase.
 */
function toPascalCase(str) {
    return str
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}
/**
 * Converts a string to Title Case.
 */
function toTitleCase(str) {
    return str
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
/**
 * Validates domain name.
 */
function validateDomainName(name) {
    if (!name || name.trim() === '') {
        throw new Error('Domain name cannot be empty');
    }
    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
        throw new Error('Invalid domain name: only alphanumeric characters, spaces, hyphens, and underscores are allowed');
    }
}
/**
 * Reads a template file and replaces placeholders.
 */
function processTemplate(templatePath, replacements) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}
/**
 * Generates a feature file for the domain.
 */
function generateFeatureFile(domain, outputDir) {
    const templatePath = path.join(__dirname, '..', 'templates', 'feature.template.txt');
    const outputPath = path.join(outputDir, 'features', domain, `${domain}.feature`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const titleName = toTitleCase(domain);
    const content = processTemplate(templatePath, {
        domain,
        featureTitle: titleName,
        featureDescription: `use ${titleName.toLowerCase()} functionality`,
        featureBenefit: `accomplish my goals with ${titleName.toLowerCase()}`,
        scenarioName: `Successfully use ${titleName.toLowerCase()}`,
        givenStep: `I am on the ${domain} page`,
        whenStep: `I perform an action on ${domain}`,
        thenStep: 'I should see the expected result',
        negativeScenarioName: `Handle error in ${titleName.toLowerCase()}`,
        negativeGivenStep: `I am on the ${domain} page`,
        negativeWhenStep: `I perform an invalid action on ${domain}`,
        negativeThenStep: 'I should see an error message'
    });
    fs.writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
}
/**
 * Generates step definitions for the domain.
 */
function generateStepsFile(domain, outputDir) {
    const templatePath = path.join(__dirname, '..', 'templates', 'steps.template.txt');
    const outputPath = path.join(outputDir, 'src', 'steps', domain, `${domain}.steps.ts`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const pascalName = toPascalCase(domain);
    const content = processTemplate(templatePath, {
        featureName: domain,
        PageName: pascalName,
        domain
    });
    fs.writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
}
/**
 * Generates page object for the domain.
 */
function generatePageFile(domain, outputDir) {
    const templatePath = path.join(__dirname, '..', 'templates', 'page.template.txt');
    const outputPath = path.join(outputDir, 'src', 'pages', domain, `${domain}-page.ts`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const pascalName = toPascalCase(domain);
    const content = processTemplate(templatePath, {
        pageName: domain,
        PageName: pascalName,
        domain
    });
    fs.writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
}
/**
 * Generates locator YAML for the domain.
 */
function generateLocatorFile(domain, outputDir) {
    const templatePath = path.join(__dirname, '..', 'templates', 'locator.template.txt');
    const outputPath = path.join(outputDir, 'src', 'locators', 'registry', `${domain}.yaml`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const content = processTemplate(templatePath, {
        domain,
        domainPage: `${domain}Page`
    });
    fs.writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
}
/**
 * Main function to generate complete domain structure.
 */
export function generateDomain(name, options = {}) {
    validateDomainName(name);
    const domain = toKebabCase(name);
    const outputDir = process.cwd();
    // Generate all domain files
    const featurePath = generateFeatureFile(domain, outputDir);
    const stepsPath = generateStepsFile(domain, outputDir);
    const pagePath = generatePageFile(domain, outputDir);
    const locatorPath = generateLocatorFile(domain, outputDir);
    // Output success messages
    if (options.verbose) {
        console.log(`✓ Created feature file: ${featurePath}`);
        console.log(`✓ Created step definitions: ${stepsPath}`);
        console.log(`✓ Created page object: ${pagePath}`);
        console.log(`✓ Created locator registry: ${locatorPath}`);
    }
    console.log(`\n✓ Generated domain: ${domain}`);
    console.log(`  Feature: ${path.relative(outputDir, featurePath)}`);
    console.log(`  Steps: ${path.relative(outputDir, stepsPath)}`);
    console.log(`  Page: ${path.relative(outputDir, pagePath)}`);
    console.log(`  Locators: ${path.relative(outputDir, locatorPath)}`);
}
/**
 * Creates the generate:domain command for the CLI.
 */
export function createGenerateDomainCommand() {
    const command = new Command('generate:domain')
        .description('Generate complete domain structure (feature, page, steps, locators)')
        .argument('<name>', 'Domain name (e.g., billing or UserManagement)')
        .option('-v, --verbose', 'Enable verbose output')
        .action((name, options) => {
        try {
            generateDomain(name, { verbose: options.verbose });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`\n✗ Error: ${message}`);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=generate-domain.js.map