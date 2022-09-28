import * as SetupTests from "./SetupTests";

interface ITestCommand {
    selector: string;
    cmd: string;
    data: any;
}

function _openPluginCmds(plugin: any): ITestCommand[] {

}

export function runTestIfSpecified(plugin: any): void {
    if (SetupTests.pluginToTest === plugin.pluginId) {
        // It is this plugin that should be tested.
        const instructions = [
            // TODO: Add menu selection to get here.
            plugin.pluginId,  // For debugging
            ...plugin.onRunTest(),
            // TODO: Add click ok button
        ];

        plugin.$store.commit("setVar", {
            name: "instructions",
            val: JSON.stringify(instructions),
            module: "test"
        });
    }
}