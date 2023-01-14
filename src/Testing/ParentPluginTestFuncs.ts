import { slugify } from "@/Core/Utils";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import * as PluginToTest from "./PluginToTest";

export enum TestCommand {
    Click = "click",
    Text = "text",
    Wait = "wait",
    WaitUntilRegex = "waitUntilRegex",
    Upload = "upload",
    AddTests = "addTests",  // TODO: Not a class yet
    CheckBox = "checkBox",  // TODO: Not a class yet
}

export interface ITestCommand {
    selector?: string;
    cmd: TestCommand;
    data?: any;
}

export class TestClick {
    private selector: string;
    private shiftPressed: boolean;

    constructor(selector: string, shiftPressed = false) {
        this.selector = selector;
        this.shiftPressed = shiftPressed;
    }

    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Click,
            data: this.shiftPressed,
        };
    }
}

export class TestWait {
    private duration: number;

    constructor(duration = 1) {
        this.duration = duration;
    }

    get cmd(): ITestCommand {
        return {
            cmd: TestCommand.Wait,
            data: this.duration,
        };
    }
}

export class TestText {
    private selector: string;
    private text: string;

    constructor(selector: string, text: string) {
        this.selector = selector;
        this.text = text;
    }

    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Text,
            data: this.text,
        };
    }
}

export class TestWaitUntilRegex {
    private selector: string;
    private regex: string;

    constructor(selector: string, regex: string) {
        this.selector = selector;
        this.regex = regex;
    }

    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.WaitUntilRegex,
            data: this.regex,
        };
    }
}


export class TestUpload {
    private selector: string;
    private filePath: string;

    constructor(selector: string, filePath: string) {
        this.selector = selector;

        if (filePath.startsWith("file://")) {
            filePath = filePath.substring(7)
        }

        this.filePath = filePath;
    }

    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Upload,
            data: this.filePath,
        };
    }
}

export interface ITest {
    // Run before the popup opens (and before menu clicking).
    beforePluginOpens?: ITestCommand[];

    // Populate the user arguments. Do not include the command to click the
    // plugin action button.
    pluginOpen?: ITestCommand[];

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
        cmds.push(new TestClick("#hamburger-button").cmd);
    }

    cmds.push(
        ...sels.map((sel) => new TestClick(sel).cmd),
        new TestClick(lastSel).cmd,
        new TestWait(1).cmd
    );

    return cmds;
}

/**
 * If running selenium tests, this function will add any unspecified (default)
 * test commands.
 *
 * @param  {any} plugin  The plugin, with getTests() function and pluginId.
 * @returns {ITest[]}  The test definitions.
 */
function addTestDefaults(plugin: any): ITest[] {
    let tests: ITest | ITest[] = plugin.getTests();
    const pluginId: string = plugin.pluginId;

    // If tests is ITest, wrap it in an array.
    if (!Array.isArray(tests)) {
        tests = [tests];
    }

    // If any elements of each test are undefined, replace with defaults.
    for (const test of tests) {
        test.beforePluginOpens = test.beforePluginOpens || [];
        test.pluginOpen = test.pluginOpen || [];
        test.closePlugin = test.closePlugin || [
            new TestClick(`#modal-${pluginId} .action-btn`).cmd,
        ];
        test.afterPluginCloses =
            test.afterPluginCloses ||
            (plugin.logJob
                ? [
                      new TestWaitUntilRegex(
                          "#log",
                          'Job "' + pluginId + ':.+?" ended'
                      ).cmd,
                  ]
                : []);
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
        const tests = addTestDefaults(plugin); // Defined in each plugin

        // If there is more than one test but pluginTestIndex is undefined, send
        // back command to add tests.
        if (tests.length > 1 && PluginToTest.pluginTestIndex === undefined) {
            plugin.$store.commit("setVar", {
                name: "cmds",
                val: JSON.stringify([
                    // TODO: Needs to be a class?
                    {
                        cmd: TestCommand.AddTests,
                        data: tests.length,
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
            ...(test.pluginOpen as ITestCommand[]), // Defined in each plugin
            new TestWait(1).cmd,
            ...(test.closePlugin as ITestCommand[]), // Defined in each plugin
            ...(test.afterPluginCloses as ITestCommand[]), // Defined in each plugin
            new TestWait(0.5).cmd,
        ] as ITestCommand[];

        plugin.$store.commit("setVar", {
            name: "cmds",
            val: JSON.stringify(cmds),
            module: "test",
        });
    }
}
