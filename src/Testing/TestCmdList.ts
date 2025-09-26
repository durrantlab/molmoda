// A container for test commmands, with added functions for common tasks.

import { FileInfo } from "@/FileSystem/FileInfo";
import { loadRemoteToFileInfo } from "@/Plugins/Core/RemoteMolLoaders/RemoteMolLoadersUtils";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import {
    TestClick,
    TestCmdParent,
    TestText,
    TestUpload,
    TestWait,
    TestWaitUntilNotRegex,
    TestWaitUntilRegex,
} from "./TestCommands";
import { pluginsApi } from "@/Api/Plugins";
import { messagesApi } from "@/Api/Messages";
import { expandAndShowAllMolsInTree } from "./SetupTests";
import { openRemoteFile } from "@/FileSystem/UrlOpen";
import * as StyleManager from "@/Core/Styling/StyleManager";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
import { addFailingUrlSubstring } from "@/Core/Fetcher";
import { ITestCommand } from "./TestInterfaces";
import { visualizationApi } from "@/Api/Visualization";

const examplesLoaded: string[] = [];

/**
 * A container for test commmands, with added functions for common tasks.
 */
export class TestCmdList {
    private tests: TestCmdParent[] = [];

    /**
     * Click a button as if the user had clicked it.
     *
     * @param {string}  selector              The CSS selector for the button.
     * @param {boolean} [shiftPressed=false]  Whether the shift key was pressed.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public click(selector: string, shiftPressed = false): TestCmdList {
        this.tests.push(new TestClick(selector, shiftPressed));
        return this;
    }

    /**
     * Wait for a specified number of seconds.
     *
     * @param {number} [durationInSecs=1]  The number of seconds to wait.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public wait(durationInSecs = 1): TestCmdList {
        this.tests.push(new TestWait(durationInSecs));
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
        this.tests.push(new TestText(selector, text));
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
        this.tests.push(new TestWaitUntilRegex(selector, regex));
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
        this.tests.push(new TestWaitUntilNotRegex(selector, regex));
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
        this.tests.push(new TestUpload(selector, filePath));
        return this;
    }

    /**
     * Returns the list of test commands.
     *
     * @returns {ITestCommand[]} The list of test commands.
     */
    public get cmds(): ITestCommand[] {
        return this.tests.map((test: TestCmdParent) => test.cmd);
    }

    /**
     * Adds a custom style programmatically for test setup.
     *
     * @param {string} styleName The name of the style.
     * @param {ISelAndStyle} styleDefinition The style definition.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public addCustomStyle(
        styleName: string,
        styleDefinition: ISelAndStyle
    ): TestCmdList {
        StyleManager.addCustomStyle(styleName, styleDefinition, true); // Overwrite for test predictability
        return this;
    }
    /**
     * Opens a plugin programmatically by its ID.
     *
     * @param {string} pluginId The ID of the plugin to open.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public openPlugin(pluginId: string): TestCmdList {
        pluginsApi.runPlugin(pluginId);
        return this;
    }
    /**
     * Opens a plugin with a specific payload. This bypasses the menu system.
     *
     * @param {string} pluginId The ID of the plugin to open.
     * @param {any} payload The payload to pass to the plugin's onPluginStart method.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public openPluginWithPayload(pluginId: string, payload: any): TestCmdList {
        pluginsApi.runPlugin(pluginId, payload);
        return this;
    }

    /**
     * Simulates a failure for any URL containing the given substring.
     * This is executed immediately during test setup on the client.
     *
     * @param {string} substring The substring to match in the URL.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public failUrl(substring: string): TestCmdList {
        addFailingUrlSubstring(substring);
        return this;
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
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public loadExampleMolecule(
        expandInMoleculeTree = false,
        url = "4WP4.pdb"
    ): TestCmdList {
        if (examplesLoaded.indexOf(url) !== -1) {
            // Already loaded
            return this;
        }
        examplesLoaded.push(url);
        // If its biotite, load it differently
        // If url ends in .molmoda
        if (url.endsWith(".molmoda")) {
            // Load the file
            void openRemoteFile(url);
        } else {
            const spinnerId = messagesApi.startWaitSpinner();
            void loadRemoteToFileInfo(url, false)
                .then((fileInfo: FileInfo) => {
                    return getMoleculesFromStore().loadFromFileInfo({
                        fileInfo,
                        tag: null,
                    });
                })
                .then(() => {
                    expandAndShowAllMolsInTree();
                    return visualizationApi.viewer;
                })
                .then((v) => {
                    v.zoomOnFocused();
                    return;
                })
                .catch((err: string) => {
                    messagesApi.popupError(err);
                    return;
                })
                .finally(() => {
                    messagesApi.stopWaitSpinner(spinnerId);
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
     * @param {string}  [name="molecule.smi"]  The name of the file to load.
     * @returns {TestCmdList} This TestCmdList (for chaining).
     */
    public loadSMILESMolecule(
        smilesString: string,
        expandInMoleculeTree = false,
        name = "molecule"
    ): TestCmdList {
        if (examplesLoaded.indexOf(smilesString) !== -1) {
            // Already loaded
            return this;
        }
        examplesLoaded.push(smilesString);
        const fileInfo = new FileInfo({
            name: `${name}.smi`,
            contents: smilesString,
        });
        void getMoleculesFromStore()
            .loadFromFileInfo({
                fileInfo,
                tag: null,
            })
            .then(() => {
                expandAndShowAllMolsInTree();
                return visualizationApi.viewer;
            })
            .then((v) => {
                v.zoomOnFocused();
                return;
            })
            .catch((err: string) => {
                messagesApi.popupError(err);
                return;
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
