const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
    test: {
        environment: "node",
        globals: false,

        setupFiles: [
            "./tests/setup.js",
        ],

        include: [
            "tests/**/*.test.js",
        ],

        fileParallelism: false,

        testTimeout: 30000,
        hookTimeout: 30000,
    },
});