import { getUrlParam } from "./UrlParams";

describe("getUrlParam", () => {
    // Store original window.location
    const originalLocation = window.location;

    // Mock window.location
    const mockLocation = (search: string) => {
        Object.defineProperty(window, "location", {
            writable: true,
            value: {
                ...originalLocation,
                search: search,
            },
        });
    };

    afterEach(() => {
        // Restore original window.location after each test
        Object.defineProperty(window, "location", {
            writable: true,
            value: originalLocation,
        });
    });

    it("should return the value of a present URL parameter", () => {
        mockLocation("?name=test&version=1.0");
        expect(getUrlParam("name")).toBe("test");
        expect(getUrlParam("version")).toBe("1.0");
    });

    it("should return null for a missing parameter when no default is provided", () => {
        mockLocation("?name=test");
        expect(getUrlParam("missingParam")).toBeNull();
    });

    it("should return the default value for a missing parameter when one is provided", () => {
        mockLocation("?name=test");
        expect(getUrlParam("version", "default-version")).toBe(
            "default-version"
        );
    });

    it("should handle URLs with no query string", () => {
        mockLocation("");
        expect(getUrlParam("name")).toBeNull();
        expect(getUrlParam("name", "default")).toBe("default");
    });

    it("should correctly handle URI encoded characters", () => {
        mockLocation("?query=hello%20world");
        expect(getUrlParam("query")).toBe("hello world");
    });
});
