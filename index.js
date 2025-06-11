#!/usr/bin/env node --no-deprecation

// This is a minimalistic entry point that sets the installDir in systemUtils
// and delegates to the compiled TypeScript code in dist/index.js
import { setEntryPoint } from './dist/systemUtils.js';

// Set the installation directory in systemUtils
setEntryPoint(import.meta.url);

// Import and run the compiled TypeScript code
import('./dist/index.js').catch((err) => {
  console.error('Failed to load application:', err);
  process.exit(1);
});
