import { dynamicImports } from "@/Core/DynamicImports";

let DOMPurify: any = null;
/**
 * Loads the DOMPurify library dynamically. This must be called once at application startup.
 */
async function loadDOMPurify(): Promise<void> {
    if (DOMPurify === null) {
        DOMPurify = await dynamicImports.dompurify.module;
    }
}

/**
 * A robust HTML sanitizer using DOMPurify.
 * This helps prevent DOM-based XSS attacks.
 *
 * @param {string | null | undefined} unsafe The potentially unsafe string.
 * @returns {string} The sanitized string, or an empty string if input is null/undefined.
 */
export async function sanitizeHtml(
    unsafe: string | null | undefined
): Promise<string> {
    if (unsafe === null || typeof unsafe === "undefined") {
        return "";
    }
    if (DOMPurify === null) {
        await loadDOMPurify();

        // console.error(
        //     "DOMPurify is not loaded. Ensure loadDOMPurify() is called at startup."
        // );
        // return unsafe || ""; // Return unsafe string as a fallback
    }
    return DOMPurify.sanitize(unsafe, {
        // Allow only safe HTML tags and attributes
        ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "i",
            "b",
            "span",
            "div",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "a",
            "img",
        ],
        ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "id"],
        // Ensure links are safe
        ALLOWED_URI_REGEXP:
            /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
}

/**
 * A robust SVG sanitizer using DOMPurify.
 * This removes script tags, event handlers, and other potentially dangerous SVG content.
 *
 * @param {string} unsafeSvg The potentially unsafe SVG string.
 * @returns {string} The sanitized SVG string.
 */
export async function sanitizeSvg(unsafeSvg: string): Promise<string> {
    // NOTE: To use this function, you must call loadDOMPurify() separately.
    // That's because this function is called from a getter and so cannot be
    // async.
    if (typeof unsafeSvg !== "string") {
        return "";
    }
    if (DOMPurify === null) {
        await loadDOMPurify();
    }
    return DOMPurify.sanitize(unsafeSvg, {
        USE_PROFILES: { svg: true },
        ADD_TAGS: ["use", "symbol", "defs"], // Explicitly allow tags for text rendering
        ADD_ATTR: ["xlink:href"], // Explicitly allow xlink:href for <use> tags
        // Remove any remaining script-related content
        FORBID_TAGS: ["script", "object", "embed", "foreignObject"],
        FORBID_ATTR: [
            "onload",
            "onerror",
            "onmouseover",
            "onmouseout",
            "onclick",
        ],
        // Keep SVG namespace clean
        KEEP_CONTENT: false,
    });
}

/**
 * A simple HTML sanitizer that removes all but basic characters. This is a very
 * basic sanitizer and should not be used for security purposes. It is intended
 * for simple text sanitization where you only want to keep letters, numbers,
 * spaces, and basic punctuation. When you want to sanitize HTML without loading
 * the whole DOMPurify library.
 *
 * @param {string | null} html The HTML string to sanitize.
 * @returns {string | null} The sanitized HTML string, or null if input is null.
 */
// export function simpleSanitizeHTML(html: string | null): string | null {
//     if (html === null) {
//         return null;
//     }

//     // Keep only letters, numbers, spaces, and basic punctuation. Nothing else.
//     // eslint-disable-next-line regexp/no-obscure-range
//     return html.replace(/[^a-zA-Z\d\s\-.,;:!?"-()]/g, "").trim();
// }
