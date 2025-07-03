let resetLayoutFunc: (() => void) | null = null;
let _isSessionLayoutActive = false;

/**
 * Registers the function that resets the Golden Layout. This is called by the
 * GoldLayout component on mount.
 *
 * @param {Function} func The function that will perform the layout reset.
 */
export function registerResetLayoutFunc(func: () => void) {
    resetLayoutFunc = func;
}

/**
 * The public API for layout-related actions.
 */
export const layoutApi = {
    /**
     * Resets the Golden Layout to its default configuration and deactivates session layout mode.
     */
    reset() {
        if (resetLayoutFunc) {
            this.setSessionLayoutActive(false); // Deactivate session mode on reset
            resetLayoutFunc();
        } else {
            console.error("Reset layout function not registered.");
        }
    },
    /**
     * Sets whether a temporary session layout is active. When active, layout
     * changes are not saved to local storage.
     *
     * @param {boolean} isActive - True if a session layout is active.
     */
    setSessionLayoutActive(isActive: boolean) {
        _isSessionLayoutActive = isActive;
    },

    /**
     * Checks if a temporary session layout is currently active.
     *
     * @returns {boolean} True if a session layout is active.
     */
    isSessionLayoutActive(): boolean {
        return _isSessionLayoutActive;
    },
};
