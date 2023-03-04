// A container for test commmands, with added functions for common tasks.

import type { FileInfo } from "@/FileSystem/FileInfo";
import { loadRemote } from "@/Plugins/Core/RemoteMolLoaders/Utils";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import {
    ITestCommand,
    _TestClick,
    _TestCmdParent,
    _TestText,
    _TestUpload,
    _TestWait,
    _TestWaitUntilRegex,
} from "./TestCmd";
import * as api from "@/Api";

let exampleLoaded = false;

export class TestCmdList {
    private tests: _TestCmdParent[] = [];

    public click(selector: string, shiftPressed = false): TestCmdList {
        this.tests.push(new _TestClick(selector, shiftPressed));
        return this;
    }

    public wait(durationInSecs = 1): TestCmdList {
        this.tests.push(new _TestWait(durationInSecs));
        return this;
    }

    public text(selector: string, text: string): TestCmdList {
        this.tests.push(new _TestText(selector, text));
        return this;
    }

    public waitUntilRegex(selector: string, regex: string): TestCmdList {
        this.tests.push(new _TestWaitUntilRegex(selector, regex));
        return this;
    }

    public upload(selector: string, filePath: string): TestCmdList {
        this.tests.push(new _TestUpload(selector, filePath));
        return this;
    }

    public get cmds(): ITestCommand[] {
        return this.tests.map((test: _TestCmdParent) => test.cmd);
    }

    /**
     * Adds a test to load a sample molecule (small protein and ligand) for
     * testing.
     */
    public loadExampleProtein(expandInMoleculeTree = false): TestCmdList {
        if (exampleLoaded) {
            // Already loaded
            return this;
        }

        exampleLoaded = true;
        loadRemote("4WP4.pdb", false)
            .then((fileInfo: FileInfo) => {
                getMoleculesFromStore().load(fileInfo);
                return;
            })
            .catch((err: string) => {
                api.messages.popupError(err);
                // throw err;
            });

        this.waitUntilRegex("#styles", "Protein");
        if (expandInMoleculeTree) {
            this.expandMoleculesTree("4WP4.pdb:1");
        }
        return this;
    }

    /**
     * If running a selenium test, this function will generate the commands to
     * expand the tree view so a given molecule is visible.
     *
     * @param {string[] | string} treeTitles  The title(s) of the molecule to
     *                                        make visible in the molecule tree.
     */
    public expandMoleculesTree(treeTitles: string[] | string): TestCmdList {
        // If treeTitles is not array, make it one.
        if (!Array.isArray(treeTitles)) {
            treeTitles = [treeTitles];
        }

        for (const treeTitle of treeTitles) {
            this.click(
                `#navigator div[data-label="${treeTitle}"] .expand-icon`
            );
        }

        return this;
    }

    /**
     * If running a selenium test, this function will generate the command to
     * select a given molecule in the tree view.
     *
     * @param {string}  treeTitle             The title of the molecule to
     *                                        select in the molecule tree.
     * @param {boolean} [shiftPressed=false]  Whether the shift key should be
     *                                        pressed.
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
     */
    public setUserArg(
        argName: string,
        argVal: any,
        pluginId: string
    ): TestCmdList {
        debugger;
        const selector = `#modal-${pluginId} #${argName}-${pluginId}-item`;

        if (typeof argVal === "string" && argVal.startsWith("file://")) {
            this.upload(selector, argVal.substring(7));
            return this;
        }

        // TODO: Add support for other types of user arguments. For example,
        // there doesn't seem to be a command for clicking checkbox below.
        console.warn("Look here");

        // if (typeof argVal === "boolean") {
        //     return {
        //         cmd: TestCommand.CheckBox,
        //         selector,
        //         data: argVal,
        //     };
        // }

        // TODO: Only works for text currently!
        this.text(selector, argVal);
        return this;
    }

    /**
     * Adds a test command to press a plugin (popup) button. Previously named
     * `testPressButton`.
     *
     * @param {string} selector  The css selector of the button.
     */
    public pressPopupButton(selector: string, pluginId: string): TestCmdList {
        this.click(`#modal-${pluginId} ${selector}`);
        return this;
    }
}
