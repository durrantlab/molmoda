import { slugify } from "@/Core/Utils";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import * as PluginToTest from "./PluginToTest";

export enum TestCommand {
    Click = "click",
    Text = "text",
    Wait = "wait",
    WaitUntilRegex = "waitUntilRegex",
    Upload = "upload",
    AddTests = "addTests",
}

export interface ITestCommand {
    selector?: string;
    cmd: TestCommand;
    data?: any;
}

export interface ITest {
    // Run before the popup opens (and before menu clicking).
    beforePluginOpens?: ITestCommand[];

    // Populate the user arguments. Do not include the command to click the
    // plugin action button.
    populateUserArgs?: ITestCommand[];

    // Clicks the popup button to close the plugin.
    closePlugin?: ITestCommand[];

    // Run after the plugin popup is closed, and the job is running.
    afterPluginCloses?: ITestCommand[];
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
            cmd: TestCommand.Click,
        } as ITestCommand);
    }

    cmds.push(
        ...sels.map((sel) => {
            return {
                selector: `${sel}`,
                cmd: TestCommand.Click,
            } as ITestCommand;
        }),
        {
            selector: `${lastSel}`,
            cmd: TestCommand.Click,
        } as ITestCommand,
        {
            cmd: TestCommand.Wait,
            data: 1,
        } as ITestCommand
    );

    return cmds;
}

/**
 * If running selenium tests, this function will add any unspecified (default)
 * test commands.
 *
 * @param  {ITest | ITest[]} tests     The existing test definition(s).
 * @param  {string}        pluginId  The plugin id.
 * @returns {ITest[]}  The test definitions.
 */
function addTestDefaults(tests: ITest | ITest[], pluginId: string): ITest[] {
    // If tests is ITest, wrap it in an array.
    if (!Array.isArray(tests)) {
        tests = [tests];
    }

    // If any elements of each test are undefined, replace with defaults.
    for (const test of tests) {
        test.beforePluginOpens = test.beforePluginOpens || [];
        test.populateUserArgs = test.populateUserArgs || [];
        test.closePlugin = test.closePlugin || [
            {
                cmd: TestCommand.Click,
                selector: `#modal-${pluginId} .action-btn`,
            },
        ];
        test.afterPluginCloses = test.afterPluginCloses || [
            {
                cmd: TestCommand.WaitUntilRegex,
                selector: "#log",
                data: 'Job "' + pluginId + ':.+?" ended',
            },
        ];
    }

    return tests;
}

/**
 * If running a selenium test, this function will generate the commands for the
 * test. Opens plugin, runs plugin-specific test, presses action button.
 *
 * @param  {any} plugin  The plugin to test.
 */
export function createTestCmdsIfTestSpecified(plugin: any) {
    if (
        PluginToTest.pluginToTest === plugin.pluginId &&
        plugin.pluginId !== ""
    ) {
        const tests = addTestDefaults(plugin.getTests(), plugin.pluginId); // Defined in each plugin

        // If there is more than one test but pluginTestIndex is undefined, send
        // back command to add tests.
        if (tests.length > 1 && PluginToTest.pluginTestIndex === undefined) {
            plugin.$store.commit("setVar", {
                name: "cmds",
                val: JSON.stringify([
                    {
                        cmd: TestCommand.AddTests,
                        data: tests.length
                    },
                ]),
                module: "test",
            });
            return;
        }

        const test = tests[PluginToTest.pluginTestIndex || 0];

        // It is this plugin that should be tested.
        const cmds = [
            ...(test.beforePluginOpens as ITestCommand[]), // Defined in each plugin
            ..._openPluginCmds(plugin),
            ...(test.populateUserArgs as ITestCommand[]), // Defined in each plugin
            {
                cmd: TestCommand.Wait,
                data: 1,
            },
            ...(test.closePlugin as ITestCommand[]), // Defined in each plugin
            ...(test.afterPluginCloses as ITestCommand[]), // Defined in each plugin
            {
                cmd: TestCommand.Wait,
                data: 0.5,
            },
        ] as ITestCommand[];

        plugin.$store.commit("setVar", {
            name: "cmds",
            val: JSON.stringify(cmds),
            module: "test",
        });
    }
}
