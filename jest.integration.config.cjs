const { jest: baseConfig } = require('./package.json');

module.exports = {
  ...baseConfig,
  preset: 'jest-expo/node',
  testMatch: ['<rootDir>/src/model/**/*.integration.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  passWithNoTests: false,
  testTimeout: 20000,
};
