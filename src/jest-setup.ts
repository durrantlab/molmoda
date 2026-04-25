// src/jest-setup.ts

/**
 * Mocks browser and Node.js APIs not supported in the JSDOM test environment.
 * This file is run by Jest before each test suite.
 */
// Automatically swap the real worker factory (which uses `import.meta.url`,
// invalid under ts-jest's CommonJS module resolution) with its __mocks__
// counterpart for every test suite. Individual tests that need a live
// worker can override this with jest.unmock() if ever required.
jest.mock(
    "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser/EasyParserWorkerFactory"
);
// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false, // Default to a non-matching state (e.g., desktop view)
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated but good to have
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});
