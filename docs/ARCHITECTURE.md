# Architecture Documentation

## Overview

The UI Automation Framework is built on a worker-scoped architecture that ensures safe parallel execution, type safety, and extensibility. This document explains the key architectural decisions and design patterns.

## Design Principles

1. **Worker-Scoped Isolation**: Each parallel worker has its own isolated TestContext with no shared mutable state
2. **Type Safety**: Compile-time validation through TypeScript strict mode and generated typed locators
3. **Plugin Architecture**: Core framework stays lightweight (<150 lines per service), extensions via plugins
4. **Domain-Based Organization**: Tests organized by business domain for maintainability
5. **Dependency Injection**: Services injected through TestContext for testability

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Execution Layer                         │
│  (Cucumber Feature Files + Step Definitions)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Worker-Scoped TestContext                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebDriver │ Actions │ Wait │ Locators │ Logger │ Plugins│  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼────────┐ ┌───▼────────┐ ┌───▼────────┐
│  Core Services  │ │  Plugins   │ │  Locators  │
│  - WebDriver    │ │  - Metrics │ │  Generated │
│  - Actions      │ │  - Allure  │ │  from YAML │
│  - Wait         │ │  - Zephyr  │ │            │
│  - Config       │ │  - Visual  │ │            │
└─────────────────┘ └────────────┘ └────────────┘
```

## Core Components

### 1. Worker-Scoped TestContext

**Purpose**: Provides isolated execution context for each parallel worker.

**Key Features**:
- Immutable configuration
- Unique correlation IDs for tracing
- Worker-specific WebDriver instance
- Isolated plugin instances
- No shared mutable state

**Lifecycle**:
```typescript
// Before each test scenario
const context = await contextFactory.create(workerId);

// During test execution
const page = new LoginPage(context);
await page.login(username, password);

// After test scenario
await contextFactory.dispose(context);
```

**Why Worker-Scoped?**
- Prevents race conditions in parallel execution
- Enables true test isolation
- Simplifies debugging (each worker has unique correlation ID)
- Scales to 1000+ tests without shared state issues

### 2. Typed Locator System

**Problem**: String-based locator access is error-prone and lacks autocomplete.

**Solution**: Generate TypeScript types from YAML at build time.

**Flow**:
```
YAML Registry → CLI Command → Generated TypeScript → Compile-Time Safety
```

**Example**:

```yaml
# src/locators/registry/authentication.yaml
authentication:
  loginForm:
    usernameInput:
      selector: "[data-testid='username']"
      strategy: data-testid
```

```typescript
// src/locators/generated/index.ts (auto-generated)
export const locators = {
  authentication: {
    loginForm: {
      usernameInput: {
        selector: "[data-testid='username']",
        strategy: 'data-testid' as const
      } satisfies Locator
    }
  }
} as const;
```

```typescript
// Usage in page objects
private readonly loc = locators.authentication.loginForm;
await this.actions.type(this.loc.usernameInput, username);
// ✅ TypeScript autocomplete works
// ✅ Compile error if locator doesn't exist
```

**Benefits**:
- Compile-time validation
- IDE autocomplete
- Refactoring safety
- Single source of truth

### 3. Plugin Architecture

**Purpose**: Keep core framework lightweight, add features via plugins.

**Plugin Interface**:
```typescript
interface Plugin {
  readonly name: string;
  readonly version: string;
  
  initialize(): Promise<void>;
  onTestStart(testId: string, testName: string): Promise<void>;
  onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
  onStepExecuted(step: StepInfo): Promise<void>;
  onError(error: Error, context: ErrorContext): Promise<void>;
  flush(): Promise<void>;
  dispose(): Promise<void>;
}
```

**Plugin Lifecycle**:
```
Worker Start → Initialize Plugins → Test Execution → Flush Data → Dispose
```

**Built-in Plugins**:

1. **Metrics Plugin**: Tracks performance, detects regressions
2. **Allure Plugin**: Generates comprehensive test reports
3. **Zephyr Plugin**: Syncs results to test management system
4. **Visual Plugin**: Screenshot comparison for visual regression
5. **API Mock Plugin**: Network interception for test isolation
6. **Morpheus Plugin**: Development-time selector validation

**Plugin Isolation**:
- Plugin errors don't affect other plugins
- Each plugin has its own error handling
- Plugins run asynchronously in parallel

### 4. Lightweight Core Services

**Design Goal**: Each core service < 150 lines, single responsibility.

#### WebDriverService
- **Responsibility**: Browser lifecycle management only
- **Lines**: ~120
- **Delegates to**: ActionHelper (interactions), WaitStrategy (waits)

#### ActionHelper
- **Responsibility**: UI interactions with retry logic
- **Lines**: ~140
- **Features**: Auto-wait, scroll into view, screenshot on failure

#### WaitStrategy
- **Responsibility**: Element synchronization
- **Lines**: ~130
- **Conditions**: visible, clickable, present, stale, networkIdle, text, count, apiResponse, animationComplete

#### ConfigManager
- **Responsibility**: Configuration loading and validation
- **Lines**: ~100
- **Features**: Environment profiles, fail-fast validation

### 5. Domain-Based Organization

**Structure**:
```
features/
  authentication/
    login.feature
    signup.feature
  dashboard/
    overview.feature
  reports/
    generate.feature

src/steps/
  authentication/
    login.steps.ts
    signup.steps.ts
  shared/
    navigation.steps.ts
    assertion.steps.ts

src/pages/
  authentication/
    login-page.ts
    signup-page.ts
  dashboard/
    overview-page.ts
```

**Benefits**:
- Easy to locate related tests
- Clear ownership boundaries
- Scales to 1000+ tests
- Supports team-based development

## Data Flow

### Test Execution Flow

```
1. Cucumber loads feature file
   ↓
2. TestContextFactory creates worker-scoped context
   ↓
3. Step definition receives context via `this.context`
   ↓
4. Step creates page object with context
   ↓
5. Page object uses context.actions, context.wait, context.locators
   ↓
6. Actions/Wait interact with WebDriver
   ↓
7. Plugins receive lifecycle events
   ↓
8. TestContext disposed after scenario
```

### Locator Resolution Flow

```
1. Developer defines locator in YAML
   ↓
2. CLI generates TypeScript with types
   ↓
3. Page object imports generated locators
   ↓
4. Page object passes locator to ActionHelper
   ↓
5. ActionHelper converts to Selenium By
   ↓
6. WebDriver finds element
```

### Plugin Event Flow

```
Test Start → PluginManager.notifyTestStart()
   ↓
Step Executed → PluginManager.notifyStepExecuted()
   ↓
Error Occurred → PluginManager.notifyError()
   ↓
Test End → PluginManager.notifyTestEnd()
   ↓
Worker Shutdown → PluginManager.flushAll()
```

## Parallel Execution Architecture

### Worker Isolation

```
Main Process
  ├── Worker 1 (TestContext 1)
  │   ├── WebDriver Instance 1
  │   ├── Logger (correlationId: worker-1-xxx)
  │   └── Plugins (isolated instances)
  │
  ├── Worker 2 (TestContext 2)
  │   ├── WebDriver Instance 2
  │   ├── Logger (correlationId: worker-2-xxx)
  │   └── Plugins (isolated instances)
  │
  └── Worker N (TestContext N)
      ├── WebDriver Instance N
      ├── Logger (correlationId: worker-n-xxx)
      └── Plugins (isolated instances)
```

### Result Aggregation

```
Worker 1 Results → ResultAggregator
Worker 2 Results → ResultAggregator  → Combined Report
Worker N Results → ResultAggregator
```

### Metrics Aggregation

Each worker writes to SQLite database with worker-specific correlation IDs. Metrics plugin aggregates results after all workers complete.

## Dependency Graph for Smart Test Selection

### Graph Structure

```
Feature File
  ↓ imports
Step Definitions
  ↓ uses
Page Objects
  ↓ uses
Locators (YAML)
```

### Graph Building

```typescript
// Scan all files
const graph = {
  nodes: [
    { id: 'login.feature', type: 'feature' },
    { id: 'login.steps.ts', type: 'step' },
    { id: 'login-page.ts', type: 'page' },
    { id: 'authentication.yaml', type: 'locator' }
  ],
  edges: [
    { from: 'login.feature', to: 'login.steps.ts' },
    { from: 'login.steps.ts', to: 'login-page.ts' },
    { from: 'login-page.ts', to: 'authentication.yaml' }
  ]
};
```

### Affected Test Detection

```
Changed File: authentication.yaml
  ↓ traverse graph backwards
Affected: login-page.ts
  ↓ traverse graph backwards
Affected: login.steps.ts
  ↓ traverse graph backwards
Affected: login.feature

Result: Run login.feature
```

## Performance Optimization

### 1. Locator Lookup Optimization

- **Strategy**: Cache Selenium By objects
- **Benefit**: Avoid repeated string parsing
- **Tracking**: Metrics plugin flags lookups > 500ms

### 2. Wait Efficiency

- **Strategy**: Use explicit waits with appropriate timeouts
- **Tracking**: Metrics plugin calculates wait efficiency (actual vs configured)
- **Optimization**: Adjust timeouts based on historical data

### 3. Parallel Execution

- **Strategy**: Feature-level parallelization
- **Worker Count**: Configurable (default: CPU cores)
- **Balancing**: Distribute tests based on historical execution time

### 4. Smart Test Selection

- **Strategy**: Run only tests affected by code changes
- **Benefit**: 50-80% reduction in CI execution time
- **Implementation**: Dependency graph traversal

### 5. Plugin Performance

- **Strategy**: Async plugin execution, non-blocking
- **Isolation**: Plugin errors don't slow down tests
- **Batching**: Batch database writes (metrics, results)

## Error Handling Strategy

### Error Hierarchy

```
FrameworkError (base)
  ├── LocatorNotFoundError
  ├── BrowserInitializationError
  ├── ActionFailedError
  ├── WaitTimeoutError
  ├── ConfigurationError
  ├── TestDataNotFoundError
  └── StepConflictError
```

### Error Context

All errors include:
- Correlation ID (for tracing)
- Test ID
- Page URL
- Element selector (if applicable)
- Screenshot (captured automatically)
- Stack trace

### Error Recovery

1. **Retry Logic**: Actions retry 3 times with exponential backoff
2. **Graceful Degradation**: Plugin failures don't affect test execution
3. **Fail Fast**: Configuration errors fail immediately at startup

## Security Considerations

### Credential Management

- **Environment Variables**: All credentials via env vars
- **No Hardcoding**: Pre-commit hooks prevent hardcoded secrets
- **Masking**: Logger masks sensitive data automatically

### Test Data Security

- **Environment Variable Resolution**: `${TEST_PASSWORD}` resolved at runtime
- **No Plaintext**: Sensitive data never in YAML files
- **Audit Trail**: All data access logged with correlation IDs

## Scalability

### Designed for 1000+ Tests

1. **Worker-Scoped Architecture**: No shared state bottlenecks
2. **Domain Organization**: Clear boundaries for team ownership
3. **Smart Test Selection**: Run only affected tests
4. **Dependency Graph**: Fast lookups with cached graph
5. **Plugin System**: Add features without bloating core

### Performance Targets

- **Suite Execution**: < 30 minutes for 1000 tests (parallel)
- **Locator Lookup**: < 500ms per lookup
- **Wait Efficiency**: > 80% (actual wait vs timeout)
- **Worker Utilization**: > 90% (minimal idle time)

## Testing the Framework

### Unit Tests

- Test individual services in isolation
- Mock dependencies (WebDriver, plugins)
- Fast feedback (< 10 seconds)

### Property-Based Tests

- Test universal properties (e.g., context isolation)
- Generate random inputs with fast-check
- Catch edge cases

### Integration Tests

- Test service interactions
- Use real WebDriver (headless)
- Validate end-to-end flows

## Future Enhancements

### Planned Features

1. **AI-Powered Test Generation**: Generate tests from Jira stories
2. **Self-Healing Locators**: Auto-update broken selectors
3. **Visual AI**: ML-based visual regression detection
4. **Test Flakiness Detection**: Identify and quarantine flaky tests
5. **Multi-Browser Grid**: Selenium Grid integration

### Extensibility Points

- Custom plugins via Plugin interface
- Custom wait conditions via WaitStrategy
- Custom reporters via Plugin system
- Custom CLI commands via Commander

## Conclusion

The UI Automation Framework is designed for scale, safety, and maintainability. The worker-scoped architecture ensures parallel safety, typed locators provide compile-time validation, and the plugin system enables extensibility without complexity.

For questions or contributions, see the main [README.md](../README.md).
