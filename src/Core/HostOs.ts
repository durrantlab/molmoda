export enum HostOs {
    Windows = "windows",
    Linux = "linux",
    Mac = "macOS"
}

const DEBUG_WINDOWS = false;

/**
 * Detect the host OS.
 * 
 * @returns {HostOs}  The host OS.
 */
export function detectPlatform(): HostOs {
    if (DEBUG_WINDOWS) {
        return HostOs.Windows;  // For debugging
    }

    const navigatorWithUAData = navigator as Navigator & { userAgentData?: { platform: string } };


    if (navigatorWithUAData.userAgentData && navigatorWithUAData.userAgentData.platform) {
        const platform = navigatorWithUAData.userAgentData.platform.toLowerCase();

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
