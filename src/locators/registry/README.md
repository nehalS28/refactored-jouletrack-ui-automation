# Locator Registry

This directory contains YAML files that define all UI element locators for the automation framework.

## Schema

Each YAML file follows this structure:

```yaml
domain:
  component:
    elementName:
      selector: string      # Required: The selector value
      strategy: string      # Required: One of 'css', 'data-testid', 'xpath', 'aria-label'
      description: string   # Required: Human-readable description
      timeout: number       # Optional: Custom timeout in milliseconds
```

## Supported Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| `css` | Standard CSS selector | `button[type='submit']` |
| `data-testid` | Data attribute selector | `[data-testid='login-button']` |
| `xpath` | XPath expression | `//button[@type='submit']` |
| `aria-label` | ARIA label selector | `[aria-label='Submit form']` |

**Note:** CSS selectors are the preferred strategy for performance and maintainability.

## Files

- `authentication.yaml` - Login, registration, forgot password, logout
- `dashboard.yaml` - Header, sidebar, widgets, charts, alerts
- `reports.yaml` - Report list, viewer, generator, scheduling
- `settings.yaml` - Profile, security, notifications, preferences, integrations

## Usage

Locators are generated into TypeScript at build time using:

```bash
npm run generate:locators
```

This creates `src/locators/generated/index.ts` with typed locator objects.

## Adding New Locators

1. Identify the domain (authentication, dashboard, reports, settings, or create new)
2. Add the locator to the appropriate YAML file
3. Run `npm run generate:locators` to regenerate TypeScript
4. Use the typed locator in your page objects

## Best Practices

1. **Use data-testid** for elements that need stable selectors
2. **Keep descriptions clear** - they appear in error messages
3. **Group by component** - organize related elements together
4. **Use meaningful names** - `submitButton` not `btn1`
5. **Set custom timeouts** only when needed (e.g., slow-loading elements)

## Requirements

This locator registry implements:
- Requirement 1.1: Centralized locator storage in structured YAML format
- Requirement 1.3: Multiple locator strategies with CSS as preferred
