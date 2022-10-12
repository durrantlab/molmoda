/* eslint-disable jsdoc/check-tag-names */
import { IFileInfo } from "@/FileSystem/Interfaces";
import { loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import { loadRemote } from "@/Plugins/Core/MolLoaderSaver/MolLoaders/Utils";
import { ITestCommand, TEST_COMMAND } from "@/Testing/ParentPluginTestFuncs";
import { Vue } from "vue-class-component";
import * as api from "@/Api";

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
 * TestingMixin
 */
export class TestingMixin extends Vue {
    runTests(tests: ITest | ITest[]): ITest[] {
        // If tests is ITest, wrap it in an array.
        if (!Array.isArray(tests)) {
            tests = [tests];
        }

        // If any elements of each test are undefined, replace with defaults.
        for (const test of tests) {
            test.beforePluginOpens = test.beforePluginOpens || [];
            test.populateUserArgs = test.populateUserArgs || [];
            test.closePlugin = test.closePlugin || [
                this.testPressButton(".action-btn"),
            ];
            test.afterPluginCloses = test.afterPluginCloses || [
                this.testWaitForRegex("#log", 'Job "loadpdb:.+?" ended'),
            ];
        }
    }

    /**
     * Adds selenium test commands to run when testing the plugin. These
     * commands run before the popup opens (and before menu clicking).
     *
     * @gooddefault
     * @document
     * @returns {ITestCommand[]}  The commands to run.
     */
    testCmdsBeforePopupOpens(): ITestCommand[] {
        return [];
    }

    /**
     * Adds selenium test commands to run when testing the plugin. These
     * commands populate the user arguments. Do not include the command to click
     * the plugin action button.
     *
     * @gooddefault
     * @document
     * @returns {ITestCommand[]}  The commands to run.
     */
    testCmdsToPopulateUserArgs(): ITestCommand[] {
        // TODO: In future, this should be abstract (required for children).
        return [];
    }

    /**
     * Adds a selenium test command to run when testing the plugin. This command
     * clicks the popup button to close the plugin.
     *
     * @gooddefault
     * @document
     * @returns {ITestCommand[]}  The commands to run (probably only one, to
     *     press the button).
     */
    testCmdsToClosePlugin(): ITestCommand[] {
        return [this.testPressButton(".action-btn")];
    }

    /**
     * Adds selenium test commands to run when testing the plugin. These
     * commands run after the plugin popup is closed, and the job is running.
     *
     * @gooddefault
     * @document
     * @returns {ITestCommand[]}  The commands to run.
     */
    testCmdsAfterPopupClosed(): ITestCommand[] {
        return [this.testWaitForRegex("#log", 'Job "loadpdb:.+?" ended')];
    }

    /**
     * If running a selenium test, this function will generate the command to
     * test a specific user argument.
     *
     * @param  {string} argName   The name of the specific user argument.
     * @param  {any}    argVal    The value of the specific user argument.
     * @helper
     * @document
     * @returns {ITestCommand}  The command to test the specific user argument.
     */
    testUserArg(argName: string, argVal: any): ITestCommand {
        const selector = `#modal-${(this as any).pluginId} #${argName}-item`;

        // TODO: Only works for text currently!
        return {
            selector,
            cmd: TEST_COMMAND.TEXT,
            data: argVal,
        };
    }

    /**
     * If running a selenium test, this function will generate the command to wait
     * until a given DOM element contains specified text.
     *
     * @param  {string} selector  The selector of the DOM element.
     * @param  {string} regex     The regex to wait for, as a string.
     * @helper
     * @document
     * @returns {ITestCommand}  The command to wait until the DOM element contains
     *     the specified text.
     */
    testWaitForRegex(selector: string, regex: string): ITestCommand {
        return {
            cmd: TEST_COMMAND.WAIT_UNTIL_REGEX,
            selector,
            data: regex,
        };
    }

    /**
     * Adds a selenium test command to press a plugin (popup) button.
     *
     * @param {string} selector  The css selector of the button.
     * @helper
     * @document
     * @returns {ITestCommand}  The command to run.
     */
    testPressButton(selector: string): ITestCommand {
        return {
            cmd: TEST_COMMAND.CLICK,
            selector: `#modal-${(this as any).pluginId} ${selector}`,
        };
    }

    /**
     * Adds a selenium test command to load a sample molecule (small protein and
     * ligand) for testing.
     *
     * @helper
     * @document
     * @returns {ITestCommand}  The command to wait for the molecule to load.
     */
    testLoadExampleProtein(): ITestCommand {
        loadRemote("4WP4.pdb", false)
            .then((fileInfo: IFileInfo) => {
                loadMoleculeFile(fileInfo);
                return;
            })
            .catch((err: string) => {
                api.messages.popupError(err);
            });

        // TODO: testWaitForRegex("#styles", "Protein") used elsewhere. Could make
        // "wait for file load" command.
        return this.testWaitForRegex("#styles", "Protein");
    }
}
