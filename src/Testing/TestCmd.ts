import { slugify } from "@/Core/Utils";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import * as PluginToTest from "./PluginToTest";

enum TestCommand {
    Click = "click",
    Text = "text",
    Wait = "wait",
    WaitUntilRegex = "waitUntilRegex",
    Upload = "upload",
    AddTests = "addTests", // TODO: Not a class yet
    CheckBox = "checkBox", // TODO: Not a class yet
}

export interface ITestCommand {
    selector?: string;
    cmd: TestCommand;
    data?: any;
}

/**
 * A class to generate the command to type text into a selector.  Should only be
 * called from class TestCmdList. The parent that all test commands should
 * inherit from.
 */
export abstract class _TestCmdParent {
    /**
     * Generates the command.
     *
     * @returns {ITestCommand}  The command.
     */
    abstract get cmd(): ITestCommand;
}

/**
 * A class to generate the command to click a selector. Should only be called
 * from class TestCmdList.
 */
export class _TestClick extends _TestCmdParent {
    private selector: string;
    private shiftPressed: boolean;

    /**
     * Creates an instance of _TestClick.
     *
     * @param  {string}  selector              The selector to click.
     * @param  {boolean} [shiftPressed=false]  If true, the shift key will be
     *                                         pressed while clicking.
     */
    constructor(selector: string, shiftPressed = false) {
        super();
        this.selector = selector;
        this.shiftPressed = shiftPressed;
    }

    /**
     * Generates the command to click the selector.
     *
     * @returns {ITestCommand}  The command to click the selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Click,
            data: this.shiftPressed,
        };
    }
}

/**
 * A class to generate the command to wait for a specified duration.  Should
 * only be called from class TestCmdList.
 */
export class _TestWait extends _TestCmdParent {
    private duration: number;

    /**
     * Creates an instance of _TestWait.
     *
     * @param  {number} [durationInSecs=1]  The duration to wait, in seconds.
     */
    constructor(durationInSecs = 1) {
        super();
        this.duration = durationInSecs;
    }

    /**
     * Generates the command to wait for the specified duration.
     *
     * @returns {ITestCommand}  The command to wait for the specified duration.
     */
    get cmd(): ITestCommand {
        return {
            cmd: TestCommand.Wait,
            data: this.duration,
        };
    }
}

/**
 * A class to generate the command to type text into a selector.  Should only be
 * called from class TestCmdList.
 */
export class _TestText extends _TestCmdParent {
    private selector: string;
    private text: string;

    /**
     * Creates an instance of _TestText.
     *
     * @param  {string} selector  The selector to type into.
     * @param  {string} text      The text to type.
     */
    constructor(selector: string, text: string) {
        super();
        this.selector = selector;
        this.text = text;
    }

    /**
     * Generates the command to type the specified text into the specified
     * selector.
     *
     * @returns {ITestCommand}  The command to type the specified text into the
     *     specified selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Text,
            data: this.text,
        };
    }
}

/**
 * A class to generate the command to wait until the specified regex is found in
 * the specified selector. Should only be called from class TestCmdList.
 */
export class _TestWaitUntilRegex extends _TestCmdParent {
    private selector: string;
    private regex: string;

    /**
     * Creates an instance of _TestWaitUntilRegex.
     *
     * @param  {string} selector  The selector to monitor.
     * @param  {string} regex     The regex to wait for.
     */
    constructor(selector: string, regex: string) {
        super();
        this.selector = selector;
        this.regex = regex;
    }

    /**
     * Generates the command to wait until the specified regex is found in the
     * specified selector.
     *
     * @returns {ITestCommand}  The command to wait until the specified regex is
     *    found in the specified selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.WaitUntilRegex,
            data: this.regex,
        };
    }
}

/**
 * A class to generate the command to upload a file. Should only be called from
 * class TestCmdList.
 */
export class _TestUpload extends _TestCmdParent {
    private selector: string;
    private filePath: string;

    /**
     * Creates an instance of TestUpload.
     *
     * @param  {string} selector  The selector to upload to.
     * @param  {string} filePath  The file path to upload.
     */
    constructor(selector: string, filePath: string) {
        super();
        this.selector = selector;

        if (filePath.startsWith("file://")) {
            filePath = filePath.substring(7);
        }

        this.filePath = filePath;
    }

    /**
     * Generates the command to upload the specified file to the specified
     * selector.
     *
     * @returns {ITestCommand}  The command to upload the specified file to the
     *    specified selector.
     */
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

    // Clicks the popup button to close the plugin. Set to [] explicitly for
    // those rare plugins that have no popups.
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
        cmds.push(new _TestClick("#hamburger-button").cmd);
    }

    cmds.push(
        ...sels.map((sel) => new _TestClick(sel).cmd),
        new _TestWait(1).cmd,
        new _TestClick(lastSel).cmd,
        new _TestWait(1).cmd
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
            new _TestClick(`#modal-${pluginId} .action-btn`).cmd,
        ];
        test.afterPluginCloses =
            test.afterPluginCloses ||
            // If you're loging the job, wait for notice of job ending.
            (plugin.logJob
                ? [
                      new _TestWaitUntilRegex(
                          "#log",
                          "Job " + pluginId + '.*?" ended'
                      ).cmd,
                  ]
                // Otherwise, just want 1 second to give a little time for
                // errors to pop up, if any.
                : [new _TestWait(1).cmd]);
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
        Here is where you need to eliminate .cmds somehow.

        let tests: ITest | ITest[] = plugin.getTests();

        const tests = addTestDefaults(tests); // Defined in each plugin

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
            new _TestWait(1).cmd,
            ...(test.closePlugin as ITestCommand[]), // Defined in each plugin
            ...(test.afterPluginCloses as ITestCommand[]), // Defined in each plugin
            new _TestWait(0.5).cmd,
        ] as ITestCommand[];

        plugin.$store.commit("setVar", {
            name: "cmds",
            val: JSON.stringify(cmds),
            module: "test",
        });
    }
}
