import { TestCmdList } from "./TestCmdList";
import { ITest } from "./TestInterfaces";

/**
 * Creates a test that will always fail. Useful as a placeholder during development.
 * @param {string} [message="TODO: Implement this test"] - Optional message to indicate why the test is failing
 * @returns {ITest} A test configuration that will always fail
 */
function createFailingTest(message = "TODO: Implement this test"): ITest {
    return {
        /** 
         * Returns a command list that will always fail by waiting for a non-existent element.
         * @returns {TestCmdList} A command list that fails
         */
        pluginOpen: () => new TestCmdList(),
        /**
         * Returns a command list that fails by waiting for a non-existent element.
         * @returns {TestCmdList} A command list that fails
         */
        afterPluginCloses: () => new TestCmdList()
            .waitUntilRegex("#non-existent-element", message)
    };
}

// Convenience export for single failing test case
export const FailingTest: ITest = createFailingTest();