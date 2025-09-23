import type { TestCmdList } from "./TestCmdList";

export enum TestCommand {
    Click = "click",
    Text = "text",
    Wait = "wait",
    WaitUntilRegex = "waitUntilRegex",
    WaitUntilNotRegex = "waitUntilNotRegex",
    Upload = "upload",
    AddTests = "addTests", // TODO: Not a class yet
    CheckBox = "checkBox", // TODO: Not a class yet
}

export interface ITestCommand {
    selector?: string;
    cmd: TestCommand;
    data?: any;
}

export interface ITest {
    name?: string;
    // Run before the popup opens (and before menu clicking).
    beforePluginOpens?: () => TestCmdList;
    // Populate the user arguments. Do not include the command to click the
    // plugin action button.
    pluginOpen?: () => TestCmdList;
    // Clicks the popup button to close the plugin. Set to [] explicitly for
    // those rare plugins that have no popups.
    closePlugin?: () => TestCmdList;
    // Run after the plugin popup is closed, and the job is running.
    afterPluginCloses?: () => TestCmdList;
}
