// A container for test commmands, with added functions for common tasks.

import { FileInfo } from "@/FileSystem/FileInfo";
import { loadRemoteToFileInfo } from "@/Plugins/Core/RemoteMolLoaders/RemoteMolLoadersUtils";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import {
    ITestCommand,
    _TestClick,
    _TestCmdParent,
    _TestText,
    _TestUpload,
    _TestWait,
    _TestWaitUntilNotRegex,
    _TestWaitUntilRegex,
} from "./TestCmd";
import * as api from "@/Api";
import { expandAndShowAllMolsInTree } from "./SetupTests";
import { openRemoteFile } from "@/FileSystem/UrlOpen";
import { getUrlParam } from "@/Core/UrlParams";

const examplesLoaded: string[] = [];

/**
 * A container for test commmands, with added functions for common tasks.
 */
export class TestCmdList {
    private tests: _TestCmdParent[] = [];

    /**
     * Click a button as if the user had clicked it.
     *
     * @param {string}  selector              The CSS selector for the button.
     * @param {boolean} [shiftPressed=false]  Whether the shift key was pressed.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public click(selector: string, shiftPressed = false): TestCmdList {
        this.tests.push(new _TestClick(selector, shiftPressed));
        return this;
    }

    /**
     * Wait for a specified number of seconds.
     *
     * @param {number} [durationInSecs=1]  The number of seconds to wait.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public wait(durationInSecs = 1): TestCmdList {
        this.tests.push(new _TestWait(durationInSecs));
        return this;
    }

    /**
     * Type text into a text box.
     *
     * @param {string} selector  The CSS selector for the text box.
     * @param {string} text      The text to type.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public text(selector: string, text: string): TestCmdList {
        this.tests.push(new _TestText(selector, text));
        return this;
    }

    /**
     * Wait until a given regex matches the text of an element.
     *
     * @param {string} selector  The CSS selector for the element.
     * @param {string} regex     The regex to match.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public waitUntilRegex(selector: string, regex: string): TestCmdList {
        this.tests.push(new _TestWaitUntilRegex(selector, regex));
        return this;
    }

    /**
     * Wait until a given regex does not match the text of an element.
     *
     * @param {string} selector  The CSS selector for the element.
     * @param {string} regex     The regex to match.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public waitUntilNotRegex(selector: string, regex: string): TestCmdList {
        this.tests.push(new _TestWaitUntilNotRegex(selector, regex));
        return this;
    }

    /**
     * Upload a file.
     *
     * @param {string} selector  The CSS selector for the file input.
     * @param {string} filePath  The path to the file to upload.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public upload(selector: string, filePath: string): TestCmdList {
        this.tests.push(new _TestUpload(selector, filePath));
        return this;
    }

    /**
     * Returns the list of test commands.
     *
     * @returns {ITestCommand[]} The list of test commands.
     */
    public get cmds(): ITestCommand[] {
        return this.tests.map((test: _TestCmdParent) => test.cmd);
    }

    /**
     * Adds a test to load a sample molecule (small protein and ligand) for
     * testing.
     *
     * @param {boolean} [expandInMoleculeTree=false]  Whether to expand the
     *                                                molecule tree to show the
     *                                                molecule.
     * @param {string}  [url="4WP4.pdb"]              The URL of the molecule to
     *                                                load.
     * @param {number}  [testIdx]                     The index of the test.
     *                                                Will not load file if
     *                                                doesn't match. Note that
     *                                                testIdx is 0-indexed.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public loadExampleMolecule(
        expandInMoleculeTree = false,
        url = "4WP4.pdb",
        testIdx?: number
    ): TestCmdList {
        if (examplesLoaded.indexOf(url) !== -1) {
            // Already loaded
            return this;
        }

        if (testIdx !== undefined) {
            const testIdxFrmURL = parseInt(getUrlParam("index") as string);
            if (testIdxFrmURL !== testIdx) {
                return this;
                // Not the right test.
            }
        }

        examplesLoaded.push(url);

        // If its biotite, load it differently
        // If url ends in .molmoda
        if (url.endsWith(".molmoda")) {
            // Load the file
            openRemoteFile(url);
        } else {
            loadRemoteToFileInfo(url, false)
                .then((fileInfo: FileInfo) => {
                    return getMoleculesFromStore().loadFromFileInfo({
                        fileInfo,
                        tag: null,
                    });
                })
                .then(() => {
                    expandAndShowAllMolsInTree();
                    return api.visualization.viewer;
                })
                .then((v) => {
                    v.zoomOnFocused();
                    return;
                })
                .catch((err: string) => {
                    api.messages.popupError(err);
                    // throw err;
                });
        }

        this.waitUntilRegex("#styles", "Protein");
        if (expandInMoleculeTree) {
            // this.expandMoleculesTree("4WP4");
        }
        return this;
    }

    /**
     * Adds a test to load a molecule from a SMILES string for testing.
     *
     * @param {string}  smilesString          The SMILES string of the molecule to load
     * @param {boolean} [expandInMoleculeTree=false]  Whether to expand the molecule tree
     *                                               to show the molecule
     * @param {number}  [testIdx]            The index of the test. Will not load
     *                                      molecule if doesn't match. Note that
     *                                      testIdx is 0-indexed.
     * @param {string}  [name="molecule.smi"]  The name of the file to load.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public loadSMILESMolecule(
        smilesString: string,
        expandInMoleculeTree = false,
        testIdx?: number,
        name = "molecule"
    ): TestCmdList {
        if (examplesLoaded.indexOf(smilesString) !== -1) {
            // Already loaded
            return this;
        }

        if (testIdx !== undefined) {
            const testIdxFrmURL = parseInt(getUrlParam("index") as string);
            if (testIdxFrmURL !== testIdx) {
                return this;
                // Not the right test.
            }
        }

        examplesLoaded.push(smilesString);

        const fileInfo = new FileInfo({
            name: `${name}.smi`,
            contents: smilesString,
        });

        getMoleculesFromStore()
            .loadFromFileInfo({
                fileInfo,
                tag: null,
            })
            .then(() => {
                expandAndShowAllMolsInTree();
                return api.visualization.viewer;
            })
            .then((v) => {
                v.zoomOnFocused();
                return;
            })
            .catch((err: string) => {
                throw err;
            });

        this.waitUntilRegex("#styles", "Compound");
        if (expandInMoleculeTree) {
            // Similar to original function, left commented out
            // this.expandMoleculesTree("molecule");
        }
        return this;
    }

    /**
     * If running a selenium test, this function will generate the commands to
     * expand the tree view so a given molecule is visible.
     *
     * @param {string[] | string} treeTitles  The title(s) of the molecule to
     *                                        make visible in the molecule tree.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public expandMoleculesTree(treeTitles: string[] | string): TestCmdList {
        // If treeTitles is undefined, expand everything. TODO: Should this be
        // the default behavior always?
        // if (treeTitles === undefined) {
        //     const tree = getMoleculesFromStore();
        //     tree.flattened.forEach((node) => {
        //         node.treeExpanded = true;
        //     });
        //     return this;
        // }

        // If treeTitles is not array, make it one.
        if (!Array.isArray(treeTitles)) {
            treeTitles = [treeTitles];
        }

        for (const treeTitle of treeTitles) {
            this.click(
                `#navigator div[data-label="${treeTitle}"] .expand-icon`
            );
            this.wait(0.5);
        }

        return this;
    }

    // public expandEntireMoleculesTree(): TestCmdList {
    //     const treeNodeList = getMoleculesFromStore();
    //     treeNodeList.flattened.forEach((node) => {
    //         node.treeExpanded = true;
    //         node.title = "moo";
    //     });
    //     setStoreVar("molecules", treeNodeList);
    //     return this;
    // }

    /**
     * If running a selenium test, this function will generate the command to
     * select a given molecule in the tree view.
     *
     * @param {string}  treeTitle             The title of the molecule to
     *                                        select in the molecule tree.
     * @param {boolean} [shiftPressed=false]  Whether the shift key should be
     *                                        pressed.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public selectMoleculeInTree(
        treeTitle: string,
        shiftPressed = false
    ): TestCmdList {
        this.click(
            `#navigator div[data-label="${treeTitle}"] .title-text`,
            shiftPressed
        );
        return this;
    }

    /**
     * If running a selenium test, this function will generate the command to
     * test a specific user argument.
     *
     * @param  {string} argName   The name of the specific user argument.
     * @param  {any}    argVal    The value of the specific user argument.
     * @param  {string} pluginId  The ID of the plugin.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public setUserArg(
        argName: string,
        argVal: any,
        pluginId: string
    ): TestCmdList {
        const selector = `#modal-${pluginId} #${argName}-${pluginId}-item`;

        if (typeof argVal === "string" && argVal.startsWith("file://")) {
            this.upload(selector, argVal.substring(7));
            return this;
        }

        // TODO: Add support for other types of user arguments. For example,
        // there doesn't seem to be a command for clicking checkbox below.

        if (typeof argVal === "boolean") {
            // Throw an error saying to use clicks instead.
            const msg =
                "Use clicks instead of setUserArg for boolean user arguments.";
            alert(msg);
            throw new Error(msg);

            // return {
            //     cmd: TestCommand.CheckBox,
            //     selector,
            //     data: argVal,
            // };
        }

        // TODO: Only works for text currently!
        this.text(selector, argVal);
        return this;
    }

    /**
     * Adds a test command to press a plugin (popup) button. Previously named
     * `testPressButton`.
     *
     * @param {string} selector  The css selector of the button.
     * @param {string} pluginId  The ID of the plugin.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public pressPopupButton(selector: string, pluginId: string): TestCmdList {
        this.click(`#modal-${pluginId} ${selector}`);
        return this;
    }
}
