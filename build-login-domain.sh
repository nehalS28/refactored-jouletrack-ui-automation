#!/bin/bash
# Build script for login domain only
# Compiles only the files needed for login feature testing

echo "🔨 Building Login Domain..."

# Clean previous build
rm -rf dist/src/steps/authentication
rm -rf dist/src/pages/authentication  
rm -rf dist/src/locators
rm -rf dist/src/core
rm -rf dist/src/types
rm -rf dist/src/utils

# Create directories
mkdir -p dist/src/steps/authentication
mkdir -p dist/src/steps/shared
mkdir -p dist/src/pages/authentication
mkdir -p dist/src/locators
mkdir -p dist/src/core
mkdir -p dist/src/types
mkdir -p dist/src/utils

echo "📦 Compiling TypeScript files..."

# Compile core files (needed by everything)
npx tsc \
  src/types/*.ts \
  src/core/config-manager.ts \
  src/core/test-context.ts \
  src/core/action-helper.ts \
  src/core/wait-strategy.ts \
  src/core/logger.ts \
  src/core/webdriver-service.ts \
  src/pages/base-page.ts \
  src/pages/authentication/login-page.ts \
  src/steps/shared/*.steps.ts \
  src/steps/authentication/login.steps.ts \
  --outDir dist \
  --declaration \
  --declarationMap \
  --sourceMap \
  --module esnext \
  --target es2022 \
  --moduleResolution bundler \
  --esModuleInterop \
  --skipLibCheck \
  --resolveJsonModule \
  --allowSyntheticDefaultImports

if [ $? -eq 0 ]; then
  echo "✅ Login domain compiled successfully!"
  echo ""
  echo "📁 Compiled files:"
  find dist/src -name "*.js" | sort
  echo ""
  echo "🧪 Ready to run Cucumber dry-run"
else
  echo "❌ Compilation failed"
  exit 1
fi
