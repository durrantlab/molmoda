export enum HostOs {
    Windows = "windows",
    Linux = "linux",
    Mac = "macOS",
}

/**
 * Enum representing common browser types.
 */
export enum BrowserType {
    Safari = "safari",
    Chrome = "chrome", // Includes Chromium-based browsers unless specifically Edge
    Firefox = "firefox",
    Edge = "edge",
    Unknown = "unknown",
}

const DEBUG_WINDOWS = false;

/**
 * Detect the host OS.
 *
 * @returns {HostOs}  The host OS.
 */
export function detectPlatform(): HostOs {
    if (DEBUG_WINDOWS) {
        return HostOs.Windows; // For debugging
    }

    const navigatorWithUAData = navigator as Navigator & {
        userAgentData?: { platform: string };
    };

    if (
        navigatorWithUAData.userAgentData &&
        navigatorWithUAData.userAgentData.platform
    ) {
        const platform =
            navigatorWithUAData.userAgentData.platform.toLowerCase();

        if (platform.includes("mac")) {
            return HostOs.Mac;
        } else if (platform.includes("win")) {
            return HostOs.Windows;
        } else if (platform.includes("linux")) {
            return HostOs.Linux;
        }
    } else {
        // Fallback for older browsers
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes("mac")) {
            return HostOs.Mac;
        } else if (userAgent.includes("win")) {
            return HostOs.Windows;
        } else if (userAgent.includes("linux")) {
            return HostOs.Linux;
        }
    }

    // Assume Windows if not detected
    return HostOs.Windows;
}

/**
 * Detects the current browser type.
 * This method relies on checking navigator properties (userAgent, vendor) and may not be
 * 100% foolproof due to potential changes in user agent strings or spoofing.
 * The order of checks matters, especially for Chromium-based browsers like Edge.
 *
 * @returns {BrowserType} The detected browser type (Safari, Chrome, Firefox, Edge, or Unknown).
 */
export function detectBrowser(): BrowserType {
    // Check if navigator and its properties exist (important for non-browser environments like SSR)
    if (typeof navigator === "undefined") {
        return BrowserType.Unknown;
    }

    const userAgent = navigator.userAgent
        ? navigator.userAgent.toLowerCase()
        : "";
    const vendor = navigator.vendor ? navigator.vendor.toLowerCase() : "";

    // Order of checks matters here

    // 1. Check for Firefox (usually distinct UA string)
    if (userAgent.includes("firefox") || userAgent.includes("fxios")) {
        return BrowserType.Firefox;
    }

    // 2. Check for Edge (Chromium-based and older EdgeHTML)
    // Prefer 'edg/' for new Chromium Edge, fallback to 'edge/' for older Edge
    if (userAgent.includes("edg/") || userAgent.includes("edge/")) {
        return BrowserType.Edge;
    }

    // 3. Check for Chrome (and other Chromium browsers, excluding Edge already checked)
    // 'chrome' or 'crios' (Chrome on iOS) are strong indicators
    // Check for 'chromium' as well
    if (
        (userAgent.includes("chrome") ||
            userAgent.includes("crios") ||
            userAgent.includes("chromium")) &&
        !userAgent.includes("edg/")
    ) {
        // Further check vendor if needed, but usually UA is sufficient here
        // if (vendor.includes('google inc')) { // Optional: more specific check
        return BrowserType.Chrome;
        // }
    }

    // 4. Check for Safari (must have 'safari' in UA, be from Apple, and NOT be Chrome/Edge)
    // This check comes after Chrome/Edge because they often include 'safari' in their UA
    if (
        userAgent.includes("safari") &&
        vendor.includes("apple") &&
        !userAgent.includes("chrome") &&
        !userAgent.includes("crios") &&
        !userAgent.includes("edg/")
    ) {
        return BrowserType.Safari;
    }

    // 5. If none of the above match
    return BrowserType.Unknown;
}
