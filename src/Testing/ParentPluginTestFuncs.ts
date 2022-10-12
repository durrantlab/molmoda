import { slugify } from "@/Core/Utils";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import * as PluginToTest from "./PluginToTest";

export enum TEST_COMMAND {
    CLICK = "click",
    TEXT = "text",
    WAIT = "wait",
    WAIT_UNTIL_REGEX = "waitUntilRegex",
}

export interface ITestCommand {
    selector?: string;
    cmd: TEST_COMMAND;
    data?: any;
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

    const lastSel =
        ".navbar #menu-plugin-" + slugify(lastMenuData?.text as string);

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
            cmd: TEST_COMMAND.CLICK,
        } as ITestCommand);
    }

    cmds.push(
        ...sels.map((sel) => {
            return {
                selector: `${sel}`,
                cmd: TEST_COMMAND.CLICK,
            } as ITestCommand;
        }),
        {
            selector: `${lastSel}`,
            cmd: TEST_COMMAND.CLICK,
        } as ITestCommand,
        {
            cmd: TEST_COMMAND.WAIT,
            data: 1,
        } as ITestCommand
    );

    return cmds;
}

/**
 * If running a selenium test, this function will generate the commands for the
 * test. Opens plugin, runs plugin-specific test, presses action button.
 *
 * @param  {any} plugin  The plugin to test.
 */
export function createTestCmdsIfTestSpecified(plugin: any) {
    if (PluginToTest.pluginToTest === plugin.pluginId && plugin.pluginId !== "") {
        // It is this plugin that should be tested.
        const cmds = [
            ...plugin.testCmdsBeforePopupOpens(), // Defined in each plugin
            ..._openPluginCmds(plugin),
            ...plugin.testCmdsToPopulateUserArgs(), // Defined in each plugin
            {
                cmd: TEST_COMMAND.WAIT,
                data: 1,
            },
            ...plugin.testCmdsToClosePlugin(), // Defined in each plugin
            ...plugin.testCmdsAfterPopupClosed(), // Defined in each plugin
        ] as ITestCommand[];

        plugin.$store.commit("setVar", {
            name: "cmds",
            val: JSON.stringify(cmds),
            module: "test",
        });
    }
}
