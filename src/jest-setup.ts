// src/jest-setup.ts

/**
 * Mocks browser and Node.js APIs not supported in the JSDOM test environment.
 * This file is run by Jest before each test suite.
 */

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
