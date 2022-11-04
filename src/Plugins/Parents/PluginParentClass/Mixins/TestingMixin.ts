/* eslint-disable jsdoc/check-tag-names */
import { IFileInfo } from "@/FileSystem/Types";
import { parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { ITest, ITestCommand, TestCommand } from "@/Testing/ParentPluginTestFuncs";
import { Vue } from "vue-class-component";
import * as api from "@/Api";
import { loadRemote } from "@/Plugins/Core/RemoteMolLoaders/Utils";

/**
 * TestingMixin
 */
export class TestingMixin extends Vue {
    /**
     * Gets the selenium test commands for the plugin. For advanced use.
     * 
     * @gooddefault
     * @document
     * @returns {ITest[] | ITest}  The selenium test command(s).
     */
    getTests(): ITest[] | ITest {
        return [
            {
                beforePluginOpens: [],
                populateUserArgs: [],
                closePlugin: [this.testPressButton(".action-btn")],
                afterPluginCloses: [
                    this.testWaitForRegex(
                        "#log",
                        'Job "' + (this as any).pluginId + ':.+?" ended'
                    ),
                ],
            } as ITest,
        ];
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
        const selector = `#modal-${(this as any).pluginId} #${argName}-${(this as any).pluginId}-item`;

        if (typeof argVal === "string" && argVal.startsWith("file://")) {
            return {
                cmd: TestCommand.Upload,
                selector,
                data: argVal.substring(7),
            };
        }

        // TODO: Only works for text currently!
        return {
            selector,
            cmd: TestCommand.Text,
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
            cmd: TestCommand.WaitUntilRegex,
            selector,
            data: regex,
        };
    }

    /**
     * If running a selenium test, this function will generate the command to
     * wait for a user-specified number of seconds.
     *
     * @param {number} seconds  The number of seconds to wait.
     * @returns {ITestCommand}  The command to wait for the specified number of
     *    seconds.
     */
    testWait(seconds: number): ITestCommand {
        return {
            cmd: TestCommand.Wait,
            data: seconds,
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
            cmd: TestCommand.Click,
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
                parseMoleculeFile(fileInfo);
                return;
            })
            .catch((err: string) => {
                api.messages.popupError(err);
            });

        // TODO: testWaitForRegex("#styles", "Protein") used elsewhere. Could make
        // "wait for file load" command.
        return this.testWaitForRegex("#styles", "Protein");
    }

    /**
     * If running a selenium test, this function will generate the commands to
     * expand the tree view so a given molecule is visible.
     *
     * @param {string[] | string} treeTitles  The title(s) of the molecule to
     *                                        make visible in the molecule tree.
     * @returns {ITestCommand[]}  The commands to make the specified molecule
     *     visible in the tree.
     */
    testExpandMoleculesTree(treeTitles: string[] | string): ITestCommand[] {
        // If treeTitles is not array, make it one.
        if (!Array.isArray(treeTitles)) {
            treeTitles = [treeTitles];
        }

        const cmds: ITestCommand[] = [];
        for (const treeTitle of treeTitles) {
            cmds.push({
                cmd: TestCommand.Click,
                selector: `#navigator div[data-label="${treeTitle}"] .expand-icon`,
            });
        }

        return cmds;
    }

    /**
     * If running a selenium test, this function will generate the command to
     * select a given molecule in the tree view.
     *
     * @param {string} treeTitle  The title of the molecule to select in the
     *                            molecule tree.
     * @returns {ITestCommand} The command to select the specified molecule in
     *     the tree.
     */
    testSelectMoleculeInTree(treeTitle: string): ITestCommand {
        return {
            cmd: TestCommand.Click,
            selector: `#navigator div[data-label="${treeTitle}"] .title-text`,
        };
    }
}
