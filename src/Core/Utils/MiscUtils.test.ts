import { randomID, waitForCondition } from "./MiscUtils"; // Adjust path as needed

describe("randomID", () => {
    test("should generate a string with the correct format", () => {
        const id = randomID();
        expect(id).toMatch(/^id_[a-z\d]+$/);
    });

    test("should generate a string with default length", () => {
        const id = randomID();
        // Default length is 13, but "id_" prefix adds 3 characters
        expect(id.length).toBeGreaterThanOrEqual(3); // At minimum, it should have the "id_" prefix
        // The exact length can vary slightly due to the nature of toString(36)
    });

    test("should generate a string with custom length", () => {
        const customLength = 5;
        const id = randomID(customLength);
        // "id_" prefix adds 3 characters
        expect(id.length).toBeGreaterThanOrEqual(3 + customLength - 10); // Lower bound
        expect(id.length).toBeLessThanOrEqual(3 + customLength + 2); // Upper bound with some flexibility
    });

    test("should generate unique IDs when called multiple times", () => {
        const ids = new Set();
        const count = 1000;

        for (let i = 0; i < count; i++) {
            ids.add(randomID());
        }

        // If all IDs are unique, the size of the Set should equal the count
        expect(ids.size).toBe(count);
    });
});

describe("waitForCondition", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("should resolve when condition becomes true", async () => {
        let conditionValue = false;

        const promise = waitForCondition(() => conditionValue);

        // Condition is initially false, so promise should not resolve yet
        jest.advanceTimersByTime(100);
        expect(jest.getTimerCount()).toBe(1); // Timer should still be active

        // Make condition true
        conditionValue = true;

        // Advance timer to trigger the next check
        jest.advanceTimersByTime(100);

        // Ensure all pending timers are run
        jest.runAllTimers();

        // Allow any pending microtasks to execute
        await Promise.resolve();

        // Wait for promise to resolve
        await promise;

        // Timer should be cleared after condition is met
        expect(jest.getTimerCount()).toBe(0);
    });

    test("should check condition at specified frequency", async () => {
        let checkCount = 0;
        const customFrequency = 200;

        const conditionFunc = jest.fn(() => {
            checkCount++;
            return checkCount >= 3; // Condition becomes true on third check
        });

        const promise = waitForCondition(conditionFunc, customFrequency);

        // First check (synchronous, immediate call inside waitForCondition)
        expect(conditionFunc).toHaveBeenCalledTimes(1);

        // Second check (after first timer tick)
        jest.advanceTimersByTime(customFrequency);
        expect(conditionFunc).toHaveBeenCalledTimes(2);

        // Third check (after second timer tick, condition becomes true)
        jest.advanceTimersByTime(customFrequency);

        // Run all remaining timers to ensure completion
        jest.runAllTimers();

        // Allow any pending microtasks to execute
        await Promise.resolve();

        // Wait for promise to resolve
        await promise;

        expect(conditionFunc).toHaveBeenCalledTimes(3);
        // Timer should be cleared
        expect(jest.getTimerCount()).toBe(0);
    });

    test("should use default check frequency when not specified", () => {
        const conditionFunc = jest.fn(() => false);

        waitForCondition(conditionFunc);

        // The initial synchronous check has already happened.
        expect(conditionFunc).toHaveBeenCalledTimes(1);

        // Advance past the first 99ms, it should not have been called again.
        jest.advanceTimersByTime(99);
        expect(conditionFunc).toHaveBeenCalledTimes(1);

        // Advance 1 more ms to trigger the setInterval.
        jest.advanceTimersByTime(1);
        expect(conditionFunc).toHaveBeenCalledTimes(2);
    });

    test("should resolve immediately if condition is initially true", async () => {
        const conditionFunc = jest.fn(() => true);

        const promise = waitForCondition(conditionFunc);

        // When working with fake timers and promises, we need to use
        // jest.runAllTimers() to ensure all timers complete
        jest.runOnlyPendingTimers();

        // Wait for any promises in the microtask queue to resolve
        await Promise.resolve();

        // Flush remaining timers to ensure all are completed
        jest.runAllTimers();

        // Now we can safely await the promise
        await promise;

        expect(conditionFunc).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });
});
