// Utilities to make it easier to work with Electron

/**
 * Check if the program is running in Electron.
 *
 * @returns {boolean}  True if the program is running in Electron, false
 *     otherwise.
 */
export function isElectron(): boolean {
    return (window as any).electronAPI !== undefined;
}

/**
 * Setup Electron.
 */
export function setupElectron() {
    if (!isElectron()) {
        return;
    }
}

/**
 * Close the Electron window.
 */
export function closeElectron() {
    if (!isElectron()) {
        return;
    }

    // Close the window
    (window as any).electronAPI.closeProgram();
}


(window as any).isElectron = isElectron;
