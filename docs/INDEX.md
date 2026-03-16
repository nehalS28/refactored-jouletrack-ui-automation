# Documentation Index

Welcome to the UI Automation Framework documentation. This index helps you find the right documentation for your needs.

## Getting Started

**New to the framework?** Start here:

1. **[README.md](../README.md)** - Quick start guide, installation, and basic usage
2. **[EXAMPLE-TEST-SUITE.md](./EXAMPLE-TEST-SUITE.md)** - Complete working example with authentication domain
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand the framework design and architecture

## Documentation by Role

### QA Engineers (Writing Tests)

**Primary Resources**:
- [README.md](../README.md) - Setup and running tests
- [EXAMPLE-TEST-SUITE.md](./EXAMPLE-TEST-SUITE.md) - How to write tests following best practices
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions

**Key Topics**:
- Creating feature files (Gherkin)
- Writing step definitions
- Building page objects
- Managing test data
- Running tests with tags
- Debugging failing tests

### Developers (Framework Development)

**Primary Resources**:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and component details
- [README.md](../README.md) - Project structure and CLI commands
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Performance optimization

**Key Topics**:
- Worker-scoped architecture
- Plugin system
- Typed locator generation
- Dependency graph
- Core services design
- Extending the framework

### DevOps Engineers (CI/CD Integration)

**Primary Resources**:
- [README.md](../README.md) - CI/CD integration section
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - CI/CD issues and solutions

**Key Topics**:
- GitHub Actions integration
- Docker configuration
- Jenkins pipeline setup
- Environment configuration
- Parallel execution
- Test result reporting

## Documentation by Topic

### Setup & Installation
- [README.md - Installation](../README.md#installation)
- [README.md - Configuration](../README.md#configuration)
- [TROUBLESHOOTING.md - Browser Driver Issues](./TROUBLESHOOTING.md#browser-driver-issues)

### Writing Tests
- [EXAMPLE-TEST-SUITE.md](./EXAMPLE-TEST-SUITE.md) - Complete example
- [README.md - Your First Test](../README.md#your-first-test)
- [README.md - Writing Tests](../README.md#writing-tests)

### Architecture & Design
- [ARCHITECTURE.md - Overview](./ARCHITECTURE.md#overview)
- [ARCHITECTURE.md - Core Components](./ARCHITECTURE.md#core-components)
- [ARCHITECTURE.md - Data Flow](./ARCHITECTURE.md#data-flow)

### Locators
- [README.md - Typed Locators](../README.md#your-first-test)
- [EXAMPLE-TEST-SUITE.md - Locator Registry](./EXAMPLE-TEST-SUITE.md#2-locator-registry)
- [ARCHITECTURE.md - Typed Locator System](./ARCHITECTURE.md#2-typed-locator-system)

### Page Objects
- [EXAMPLE-TEST-SUITE.md - Page Object](./EXAMPLE-TEST-SUITE.md#3-page-object)
- [README.md - Page Objects](../README.md#page-objects)
- [ARCHITECTURE.md - Lightweight Core Services](./ARCHITECTURE.md#4-lightweight-core-services)

### Step Definitions
- [EXAMPLE-TEST-SUITE.md - Step Definitions](./EXAMPLE-TEST-SUITE.md#4-step-definitions)
- [README.md - Step Definitions](../README.md#step-definitions)

### Test Data
- [EXAMPLE-TEST-SUITE.md - Test Data Fixtures](./EXAMPLE-TEST-SUITE.md#5-test-data-fixtures)
- [README.md - Test Data](../README.md#test-data)

### Parallel Execution
- [README.md - Parallel Execution](../README.md#parallel-execution)
- [ARCHITECTURE.md - Parallel Execution Architecture](./ARCHITECTURE.md#parallel-execution-architecture)
- [TROUBLESHOOTING.md - Parallel Tests Interfere](./TROUBLESHOOTING.md#issue-parallel-tests-interfere-with-each-other)

### Plugins
- [README.md - Plugins](../README.md#plugins)
- [ARCHITECTURE.md - Plugin Architecture](./ARCHITECTURE.md#3-plugin-architecture)

### CLI Commands
- [README.md - CLI Commands](../README.md#cli-commands)
- [ARCHITECTURE.md - Dependency Graph](./ARCHITECTURE.md#dependency-graph-for-smart-test-selection)

### Performance
- [TROUBLESHOOTING.md - Performance Optimization](./TROUBLESHOOTING.md#performance-optimization)
- [ARCHITECTURE.md - Performance Optimization](./ARCHITECTURE.md#performance-optimization)

### Debugging
- [TROUBLESHOOTING.md - Debugging Techniques](./TROUBLESHOOTING.md#debugging-techniques)
- [TROUBLESHOOTING.md - Common Issues](./TROUBLESHOOTING.md#common-issues)

### CI/CD
- [README.md - CI/CD Integration](../README.md#cicd-integration)
- [TROUBLESHOOTING.md - CI/CD Integration Issues](./TROUBLESHOOTING.md#cicd-integration-issues)

### Test Flakiness
- [TROUBLESHOOTING.md - Test Flakiness Solutions](./TROUBLESHOOTING.md#test-flakiness-solutions)

## Quick Reference

### Common Commands

```bash
# Install and build
npm install
npm run build
npm run generate:locators

# Run tests
npm test
TAG_FILTER="@smoke" npm test
PARALLEL_WORKERS=4 npm test

# Generate boilerplate
npm run cli generate:domain --name myfeature
npm run cli generate:feature --name mytest --domain myfeature
npm run cli generate:page --name mypage --domain myfeature

# Metrics and reporting
npm run cli metrics:report --format html
npm run cli graph:build
npm run cli graph:affected --files "src/pages/login-page.ts"

# Debugging
LOG_LEVEL=debug npm test
```

### File Locations

```
packages/ui-automation/
├── README.md                          # Main documentation
├── docs/
│   ├── INDEX.md                       # This file
│   ├── ARCHITECTURE.md                # Architecture details
│   ├── EXAMPLE-TEST-SUITE.md          # Complete example
│   └── TROUBLESHOOTING.md             # Common issues
├── features/                          # Feature files (Gherkin)
├── src/
│   ├── locators/registry/             # Locator definitions (YAML)
│   ├── pages/                         # Page objects
│   ├── steps/                         # Step definitions
│   └── data/fixtures/                 # Test data
└── config/profiles/                   # Environment configs
```

## Learning Path

### Beginner (Day 1)
1. Read [README.md](../README.md) - Installation and Quick Start
2. Follow [Your First Test](../README.md#your-first-test)
3. Review [EXAMPLE-TEST-SUITE.md](./EXAMPLE-TEST-SUITE.md) - Authentication example
4. Create your first test following the example

### Intermediate (Week 1)
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the design
2. Learn about [Plugins](../README.md#plugins)
3. Explore [CLI Commands](../README.md#cli-commands)
4. Set up [Parallel Execution](../README.md#parallel-execution)
5. Configure [CI/CD Integration](../README.md#cicd-integration)

### Advanced (Month 1)
1. Study [Worker-Scoped Architecture](./ARCHITECTURE.md#1-worker-scoped-testcontext)
2. Understand [Dependency Graph](./ARCHITECTURE.md#dependency-graph-for-smart-test-selection)
3. Optimize [Performance](./TROUBLESHOOTING.md#performance-optimization)
4. Create custom plugins
5. Contribute to framework development

## Support

### Self-Service
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
2. Search documentation for keywords
3. Review [EXAMPLE-TEST-SUITE.md](./EXAMPLE-TEST-SUITE.md) for patterns

### Getting Help
1. Enable debug logging: `LOG_LEVEL=debug npm test`
2. Generate metrics report: `npm run cli metrics:report`
3. Check correlation IDs in logs for tracing
4. Review screenshots in `reports/screenshots/`

### Reporting Issues
Include in your report:
- Framework version
- Node version
- Browser version
- Error message and stack trace
- Steps to reproduce
- Relevant logs with correlation ID

## Contributing

See [README.md - Contributing](../README.md#contributing) for guidelines.

## Updates

This documentation is maintained alongside the framework. Check the git history for recent changes:

```bash
git log --oneline -- packages/ui-automation/docs/
```

---

**Last Updated**: March 2025  
**Framework Version**: 1.0.0  
**Maintained By**: QA Team
