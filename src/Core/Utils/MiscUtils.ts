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
 * @param {Function} conditionFunc         The function that returns the
 *                                         condition.
 * @param {number}   [checkFrequency=100]  The frequency to check the condition.
 * @returns {Promise<undefined>}  A promise that resolves when the condition is
 *     true.
 */
export function waitForCondition(
    conditionFunc: () => boolean,
    checkFrequency = 100
): Promise<undefined> {
    return new Promise((resolve) => {
        // Perform an immediate check
        if (conditionFunc()) {
            resolve(undefined);
            return;
        }

        // If the condition is not met, set up the interval for subsequent checks
        const interval = setInterval(() => {
            if (conditionFunc()) {
                clearInterval(interval);
                resolve(undefined);
            }
        }, checkFrequency);
    });
}
