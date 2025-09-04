/**
 * Utility functions for handling temporary share codes. These codes are used to
 * share temporary data or configurations. The codes are expected to follow a
 * specific format: "share-WORD1-WORD2-number".
 */
let sessionShareCode: string | null = null;
/**
 * Gets the share code for the current session.
 *
 * @returns {string | null} The session share code, or null if not set.
 */
export function getSessionShareCode(): string | null {
    return sessionShareCode;
}

/**
 * Sets the share code for the current session.
 *
 * @param {string} code The share code to set for the session.
 */
export function setSessionShareCode(code: string): void {
    sessionShareCode = code;
}

/**
 * Validates a share code to ensure it follows the expected format. The code
 * must be a non-empty string that starts with "share-" and contains exactly
 * three hyphen-separated segments after "share-". The last part must be numeric.
 *
 * @param {string} shareCode  The share code to validate.
 * @returns {boolean}  Returns true if the share code is valid, false otherwise.
 */
export function validateShareCode(shareCode: string): boolean {
    const trimmedCode = shareCode.trim();
    if (
        !trimmedCode ||
        typeof trimmedCode !== "string" ||
        !trimmedCode.startsWith("share-")
    ) {
        return false;
    }

    const parts = trimmedCode.split("-");
    if (parts.length !== 4) {
        return false;
    }

    // parts[0] is "share"
    // parts[1] is WORD1 (must not be empty)
    // parts[2] is WORD2 (must not be empty)
    // parts[3] must be a number
    const isNumber = /^\d+$/.test(parts[3]);

    return parts[1].length > 0 && parts[2].length > 0 && isNumber;
}
