import { createDefaultEsmPreset } from "ts-jest";

const presetConfig = createDefaultEsmPreset({
  tsconfig: "./tsconfig.json",
});

export default {
  ...presetConfig,

  testEnvironment: "node",

  roots: ["<rootDir>/test"],

  testMatch: ["**/*.test.ts"],

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  setupFiles: ["<rootDir>/test/setup.ts"],

  clearMocks: true,

  restoreMocks: true,

  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/config/**"],
};
