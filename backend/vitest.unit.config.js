const { defineConfig } = require('vitest/config');
module.exports = defineConfig({ test: {
 environment: 'node', globals: false, setupFiles: [], fileParallelism: false,
 include: ['tests/unit/schemas/**/*.test.js', 'tests/unit/utils/**/*.test.js', 'tests/unit/runtime.test.js', 'tests/unit/backend-hardening.test.js'],
} });
