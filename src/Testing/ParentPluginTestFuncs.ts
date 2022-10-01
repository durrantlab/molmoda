import { slugify } from "@/Core/Utils";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import * as SetupTests from "./SetupTests";

export interface ITestCommand {
    selector: string;
    cmd: string;
    data: any;
}

/**
 * Generates the commands to open the plugins popup window using selenium.
 *
 * @param  {any} plugin  The plugin to test.
 * @returns {ITestCommand[]}  The commands to open the plugin.
 */
function _openPluginCmds(plugin: any): ITestCommand[] {
    // Get menu clicks
    const menuData = processMenuPath(plugin.menuPath) as IMenuPathInfo[];
    if (menuData === null || menuData === undefined) {
        return [];
    }

    const lastMenuData = menuData.pop();

    const lastSel = ".navbar #menu-plugin-" + slugify(lastMenuData?.text as string);

    // If there are more than two items remaining in menuData, the second one is
    // a separator (not triggering an actual submenu that would require a
    // click). So remove that one.
    if (menuData.length > 1) {
        menuData.splice(1, 1);
    }

    const sels = menuData?.map(
        (x, i) => ".navbar #menu" + (i + 1).toString() + "-" + slugify(x.text)
    );

    const cmds: ITestCommand[] = [];

    // Check if #hamburger-button is visible.
    const hamburgerButton = document.querySelector(
        "#hamburger-button"
    ) as HTMLDivElement;

    const hamburgerButtonVisible =
        hamburgerButton !== null &&
        hamburgerButton !== undefined &&
        getComputedStyle(hamburgerButton).display !== "none";

    if (hamburgerButtonVisible) {
        cmds.push({
            selector: "#hamburger-button",
            cmd: "click",
        } as ITestCommand);
    }

    cmds.push(
        ...sels.map((sel) => {
            return {
                selector: `${sel}`,
                cmd: "click",
            } as ITestCommand;
        }),
        {
        selector: `${lastSel}`,
        cmd: "click",
    } as ITestCommand
    );

    return cmds;
}

/**
 * If running a selenium test, this function will generate the commands for the
 * test.
 *
 * @param  {any} plugin  The plugin to test.
 */
export function createTestCmdsIfTestSpecified(plugin: any) {
    if ((SetupTests.pluginToTest === plugin.pluginId) && (plugin.pluginId !== "")) {
        // It is this plugin that should be tested.
        const cmds = [
            ..._openPluginCmds(plugin),
            ...plugin.onRunTest(),  // Defined in each plugin
            {
                "cmd": "click",
                "selector": ".action-btn",
            } as ITestCommand,
        ];

        plugin.$store.commit("setVar", {
            name: "cmds",
            val: JSON.stringify(cmds),
            module: "test",
        });
    }
}
