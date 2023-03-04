/* eslint-disable jsdoc/check-tag-names */
import {
    ITest,
    ITestCommand,
    _TestClick,
    TestCommand,
    _TestText,
    _TestUpload,
    _TestWaitUntilRegex,
} from "@/Testing/TestCmd";
import { Vue } from "vue-class-component";
import * as api from "@/Api";
import { loadRemote } from "@/Plugins/Core/RemoteMolLoaders/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";

/**
 * TestingMixin
 */
export class TestingMixin extends Vue {
    private testProteinLoadRequested = false;

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[] | ITest}  The selenium test command(s).
     */
    getTests(): ITest[] | ITest {
        const afterPluginCloses =
            (this as any).logJob === true
                ? [
                      new _TestWaitUntilRegex(
                          "#log",
                          'Job "' + (this as any).pluginId + ':.+?" ended'
                      ).cmd,
                  ]
                : [];
        return [
            {
                beforePluginOpens: [],
                pluginOpen: [],
                closePlugin: [this.testPressButton(".action-btn")],
                afterPluginCloses,
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
    testSetUserArg(argName: string, argVal: any): ITestCommand {
        // TODO: Depreciation in favor of class-based system
        const selector = `#modal-${(this as any).pluginId} #${argName}-${
            (this as any).pluginId
        }-item`;

        if (typeof argVal === "string" && argVal.startsWith("file://")) {
            return new _TestUpload(selector, argVal.substring(7)).cmd;
        }

        if (typeof argVal === "boolean") {
            return {
                cmd: TestCommand.CheckBox,
                selector,
                data: argVal,
            };
        }

        // TODO: Only works for text currently!
        return new _TestText(selector, argVal).cmd;
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
        // TODO: Depreciation in favor of class-based system
        return new _TestClick(`#modal-${(this as any).pluginId} ${selector}`)
            .cmd;
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
        // TODO: Depreciation in favor of class-based system
        if (!this.testProteinLoadRequested) {
            loadRemote("4WP4.pdb", false)
                .then((fileInfo: FileInfo) => {
                    getMoleculesFromStore().load(fileInfo);
                    return;
                })
                .catch((err: string) => {
                    api.messages.popupError(err);
                    // throw err;
                });
        }
        this.testProteinLoadRequested = true;

        // TODO: testWaitForRegex("#styles", "Protein") used elsewhere. Could make
        // "wait for file load" command.
        return new _TestWaitUntilRegex("#styles", "Protein").cmd;
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
        // TODO: Depreciation in favor of class-based system

        // If treeTitles is not array, make it one.
        if (!Array.isArray(treeTitles)) {
            treeTitles = [treeTitles];
        }

        const cmds: ITestCommand[] = [];
        for (const treeTitle of treeTitles) {
            cmds.push(
                new _TestClick(
                    `#navigator div[data-label="${treeTitle}"] .expand-icon`
                ).cmd
            );
        }

        return cmds;
    }

    /**
     * If running a selenium test, this function will generate the command to
     * select a given molecule in the tree view.
     *
     * @param {string}  treeTitle             The title of the molecule to
     *                                        select in the molecule tree.
     * @param {boolean} [shiftPressed=false]  Whether the shift key should be
     *                                        pressed.
     * @returns {ITestCommand} The command to select the specified molecule in
     *     the tree.
     */
    testSelectMoleculeInTree(
        treeTitle: string,
        shiftPressed = false
    ): ITestCommand {
        // TODO: Depreciation in favor of class-based system
        return new _TestClick(
            `#navigator div[data-label="${treeTitle}"] .title-text`,
            shiftPressed
        ).cmd;
    }
}
