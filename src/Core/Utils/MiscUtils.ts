/**
 * Create a random id.
 *
 * @param  {number} [l=13] The length of the id.
 * @returns {string} The random id.
 */
export function randomID(l = 13): string {
    return (
        "id_" +
        Math.random()
            .toString(36)
            .substring(2, 2 + l)
    );
    //  + Math.random().toString(36).substring(2, 15);
}

/**
 * Wait for a condition to be true.
 *
 * @param {() => boolean} conditionFunc         The function that returns the
 *                                              condition.
 * @param {number}        [checkFrequency=100]  The frequency to check the
 *                                              condition.
 * @param {number}        [timeout=0]           The maximum time to wait in ms.
 *                                              If 0, waits indefinitely.
 * @returns {Promise<void>}  A promise that resolves when the condition is true,
 *  or rejects if it times out.
 */
export function waitForCondition(
    conditionFunc: () => boolean,
    checkFrequency = 100,
    timeout = 0
): Promise<void> {
    return new Promise((resolve, reject) => {
        // Perform an immediate check
        if (conditionFunc()) {
            resolve();
            return;
        }

        // If the condition is not met, set up the interval for subsequent checks
        const interval = setInterval(() => {
            if (conditionFunc()) {
                clearInterval(interval);
                if (timeoutId) clearTimeout(timeoutId);
                resolve();
            }
        }, checkFrequency);

        let timeoutId: number | null = null;
        if (timeout > 0) {
            timeoutId = window.setTimeout(() => {
                clearInterval(interval);
                reject(
                    new Error(`waitForCondition timed out after ${timeout}ms`)
                );
            }, timeout);
        }
    });
}
