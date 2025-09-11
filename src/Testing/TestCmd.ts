import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import * as PluginToTest from "./PluginToTest";
import { TestCmdList } from "./TestCmdList";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { slugify } from "@/Core/Utils/StringUtils";
import { ITest, ITestCommand, TestCommand } from "./TestInterfaces";
import {
    TestClick,
    TestWait,
    TestWaitUntilNotRegex,
    TestWaitUntilRegex,
    addTestsToCmdList,
} from "./TestCommands";

type IConvertedTest = { [key: string]: ITestCommand[] };

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
        ".navbar #menu-plugin-" +
        plugin.pluginId +
        "-" +
        slugify(lastMenuData?.text as string);
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
        new TestWait(1).cmd,
        new TestClick(lastSel).cmd,
        new TestWait(1).cmd
    );
    return cmds;
}

/**
 * If running selenium tests, this function will add any unspecified (default)
 * test commands. Occurs in place.
 *
 * @param  {IConvertedTest[]} convertedTests  The tests to add defaults to.
 * @param  {any} plugin  The plugin, with getTests() function and pluginId.
 */
function addTestDefaults(
    convertedTests: IConvertedTest[],
    plugin: PluginParentClass
) {
    const { pluginId } = plugin;
    if (convertedTests.length === 0) {
        convertedTests.push({} as IConvertedTest);
    }
    // If any elements of each test are undefined, replace with defaults.
    for (const test of convertedTests) {
        // Set beforePluginOpens to [] if undefined.
        test.beforePluginOpens = test.beforePluginOpens || [];
        // Set pluginOpen to [] if undefined.
        test.pluginOpen = test.pluginOpen || [];
        // Set closePlugin to [] if undefined and noPopup, otherwise set to
        // click on action button.
        if (!test.closePlugin) {
            test.closePlugin = plugin.noPopup
                ? []
                : [new TestClick(`#modal-${pluginId} .action-btn`).cmd];
        }
        // If the plugin has a popup, add a wait after closing it to prevent
        // intercepted click errors.
        if (!plugin.noPopup) {
            const waitCmd = new TestWaitUntilNotRegex(
                "body",
                'class="modal-open"'
            ).cmd;
            if (test.afterPluginCloses) {
                test.afterPluginCloses.unshift(waitCmd);
            } else {
                test.afterPluginCloses = [waitCmd];
            }
        }
        // Now consider test.afterPluginCloses. If logJob, use that to wait for
        // indication that job finished.
        if (!test.afterPluginCloses) {
            // It's not defined. Start by assuming it's empty.
            test.afterPluginCloses = [];
            if (plugin.logJob) {
                test.afterPluginCloses.push(
                    new TestWaitUntilRegex(
                        "#log",
                        "Job " + pluginId + '.*?" started'
                    ).cmd
                );
            }
        }
        // It should not end in a wait (validation).
        if (
            test.afterPluginCloses.length > 0 &&
            test.afterPluginCloses[test.afterPluginCloses.length - 1].cmd ===
                TestCommand.Wait
        ) {
            throw new Error("Last command cannot be a wait.");
        }
        // Always add a wait at the end of the test.
        test.afterPluginCloses.push(new TestWait(1).cmd);
    }
}

/**
 * If running a selenium test, this function will make a fake mouse that will
 * appear in screen shots.
 */
function makeFakeMouse() {
    // Set body cursor to none
    // document.body.style.cursor = "none";
    // Add above CSS to the page
    const style = document.createElement("style");
    style.innerHTML = `
        .custom-cursor {
            position: absolute;
            width: 37px;
            height: 50px;
            background-size: 100% 100%;
            pointer-events: none;
            z-index: 10000;
            background-image: url('fake_cursor.png');
        }
    `;
    document.head.appendChild(style);
    // Create a new div element
    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.id = "customCursor";
    document.body.appendChild(cursor);
    // Move cursor off screen initially
    cursor.style.left = "-100px";
    cursor.style.top = "-100px";
    document.addEventListener("mousemove", function (e) {
        const cursor = document.getElementById("customCursor");
        if (!cursor) {
            return;
        }
        // Update the position of the custom cursor
        cursor.style.left = e.pageX + "px";
        cursor.style.top = e.pageY + "px";
    });
}

/**
 * If running a selenium test, this function will generate the commands for the
 * test. Opens plugin, runs plugin-specific test, presses action button.
 *
 * @param  {any} plugin  The plugin to test.
 */
export async function createTestCmdsIfTestSpecified(plugin: any) {
    if (PluginToTest.pluginToTest !== plugin.pluginId) {
        return;
    }
    if (plugin.pluginId === "") {
        return;
    }
    let tests: ITest | ITest[] = await plugin.getTests();
    makeFakeMouse();
    // If tests is ITest, wrap it in an array.
    if (!Array.isArray(tests)) {
        tests = [tests];
    }
    // Convert the values of each test to cmds.
    const convertedTests: IConvertedTest[] = [];
    for (const test of tests) {
        const convertedTest: IConvertedTest = {};
        for (const key in test) {
            const testStep = test[key as keyof ITest];
            if (testStep instanceof TestCmdList) {
                convertedTest[key] = testStep.cmds;
            }
        }
        convertedTests.push(convertedTest);
    }
    addTestDefaults(convertedTests, plugin); // Defined in each plugin
    // If there is more than one test but pluginTestIndex is undefined, send
    // back command to add tests.
    if (
        convertedTests.length > 1 &&
        PluginToTest.pluginTestIndex === undefined
    ) {
        plugin.$store.commit("setVar", {
            name: "cmds",
            val: JSON.stringify([
                // TODO: Needs to be a class?
                {
                    cmd: TestCommand.AddTests,
                    data: convertedTests.length,
                },
            ]),
            module: "test",
        });
        return;
    }
    // If the plugin is not menu accessible, can't test it. Just pass it.
    // Example: moveregionsonclick
    if (plugin.menuPath === null) {
        addTestsToCmdList([]);
        // plugin.$store.commit("setVar", {
        //  name: "cmds",
        //  val: JSON.stringify([]),
        //  module: "test",
        // });
        return;
    }
    // It is this test that should be tested (not just reporting that there are
    // tests, but an actual test).
    const convertedTest = convertedTests[PluginToTest.pluginTestIndex || 0];
    const cmds = [
        ...(convertedTest.beforePluginOpens as ITestCommand[]), // Defined in each plugin
        ..._openPluginCmds(plugin),
        ...(convertedTest.pluginOpen as ITestCommand[]), // Defined in each plugin
        new TestWait(1).cmd,
        ...(convertedTest.closePlugin as ITestCommand[]), // Defined in each plugin
        ...(convertedTest.afterPluginCloses as ITestCommand[]), // Defined in each plugin
        new TestWait(0.5).cmd,
    ] as ITestCommand[];
    addTestsToCmdList(cmds);
    // plugin.$store.commit("setVar", {
    //  name: "cmds",
    //  val: JSON.stringify(cmds),
    //  module: "test",
    // });
}
