import { sanitizeHtml, sanitizeSvg } from "./Sanitize";

// Mock the dynamic import for DOMPurify
jest.mock("@/Core/DynamicImports", () => ({
    dynamicImports: {
        dompurify: {
            get module() {
                // Return a mock DOMPurify object
                return Promise.resolve({
                    sanitize: (input: string, config?: any) => {
                        // A simplified mock that mimics the real library for testing purposes.
                        // It removes script tags and event handlers.
                        if (typeof input !== "string") return "";

                        let sanitized = input.replace(
                            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
                            ""
                        );
                        sanitized = sanitized.replace(/ on\w+="[^"]*"/gi, ""); // Remove on... event handlers

                        // If svg profile is used, don't remove svg tags
                        if (config?.USE_PROFILES?.svg) {
                            return sanitized;
                        }

                        // Basic tag removal for non-SVG contexts if needed for a specific test
                        // This mock is simple; the real library is much more complex.
                        return sanitized;
                    },
                });
            },
        },
    },
}));

describe("Sanitization Functions", () => {
    describe("sanitizeHtml", () => {
        it("should remove script tags from HTML", async () => {
            const unsafeHtml =
                '<p>Hello <script>alert("XSS")</script> World</p>';
            const sanitized = await sanitizeHtml(unsafeHtml);
            expect(sanitized).not.toContain("<script>");
            expect(sanitized).toBe("<p>Hello  World</p>");
        });

        it("should remove event handlers like onclick", async () => {
            const unsafeHtml = "<b onclick=\"alert('XSS')\">Click me</b>";
            const sanitized = await sanitizeHtml(unsafeHtml);
            expect(sanitized).not.toContain("onclick");
            expect(sanitized).toBe("<b>Click me</b>");
        });

        it("should allow safe HTML tags like <p>, <b>, and <a>", async () => {
            const safeHtml =
                '<p>This is <b>bold</b> and includes a <a href="#">link</a>.</p>';
            const sanitized = await sanitizeHtml(safeHtml);
            // Our mock doesn't strip href, but a real one would validate it.
            // This test confirms the tags are preserved.
            expect(sanitized).toBe(safeHtml);
        });

        it("should handle null and undefined input gracefully", async () => {
            expect(await sanitizeHtml(null)).toBe("");
            expect(await sanitizeHtml(undefined)).toBe("");
        });
    });

    describe("sanitizeSvg", () => {
        it("should remove script tags from SVG content", async () => {
            const unsafeSvg = '<svg><script>alert("XSS")</script><rect/></svg>';
            const sanitized = await sanitizeSvg(unsafeSvg);
            expect(sanitized).not.toContain("<script>");
            expect(sanitized).toBe("<svg><rect/></svg>");
        });

        it("should remove event handlers like onload from SVG elements", async () => {
            const unsafeSvg = "<svg onload=\"alert('XSS')\"><circle/></svg>";
            const sanitized = await sanitizeSvg(unsafeSvg);
            expect(sanitized).not.toContain("onload");
            expect(sanitized).toBe("<svg><circle/></svg>");
        });

        it("should allow SVG-specific tags like <use> and attributes like xlink:href", async () => {
            // Our mock is simple, but this test structure shows intent.
            // The real DOMPurify with the SVG profile would preserve these.
            const safeSvg =
                '<svg><defs><symbol id="shape"/></defs><use xlink:href="#shape"></use></svg>';
            const sanitized = await sanitizeSvg(safeSvg);
            expect(sanitized).toContain("<use");
        });
    });
});
