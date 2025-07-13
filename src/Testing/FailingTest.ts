import { ITest } from "./TestCmd";
import { TestCmdList } from "./TestCmdList";

/**
 * Creates a test that will always fail. Useful as a placeholder during development.
 * 
 * @param {string} [message="TODO: Implement this test"] - Optional message to indicate why the test is failing
 * @returns {ITest} A test configuration that will always fail
 */
function createFailingTest(message = "TODO: Implement this test"): ITest {
    return {
        pluginOpen: new TestCmdList(),
        afterPluginCloses: new TestCmdList()
            .waitUntilRegex("#non-existent-element", message)
    };
}

// Convenience export for single failing test case
export const FailingTest: ITest = createFailingTest();