module.exports = {
  // An array of directory names to be searched recursively up from the root directory.
  roots: ['<rootDir>/src'],

  // Run this file before each test suite to set up mocks.
  setupFilesAfterEnv: ['<rootDir>/src/jest-setup.ts'],

  // Use the ts-jest preset to enable TypeScript support
  preset: 'ts-jest',

  // The environment in which the tests should be run (jsdom for browser-like environment)
  testEnvironment: 'jsdom',

  // A map of file extensions to their transformers
  transform: {
    // Process `.vue` files with vue-jest
    '^.+\\.vue$': '@vue/vue3-jest',
    // Process `.ts` and `.tsx` files with ts-jest
    '^.+\\.tsx?$': 'ts-jest',
  },

  // A map of module names to a path. This is crucial for handling path aliases like @/
  moduleNameMapper: {
    // Your existing alias must come after the specific mock
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // The pattern Jest uses to detect test files (will now only apply within the `src` root)
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',

  // An array of file extensions your modules use
  moduleFileExtensions: ['ts', 'js', 'vue', 'json', 'node'],
};