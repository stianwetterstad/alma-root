const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.js"],
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    clearMocks: true
  }
});
