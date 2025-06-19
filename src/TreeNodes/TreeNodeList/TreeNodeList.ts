import { messagesApi } from "@/Api/Messages";
import type { FileInfo } from "@/FileSystem/FileInfo";
import { _convertTreeNodeList } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeList";
import { _parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import type { ITreeNode, TreeNode } from "../TreeNode/TreeNode";
import { TreeNodeListCopies } from "./_Copy";
import { EasyCriterion, TreeNodeListFilters } from "./_Filters";
import { TreeNodeListNodeActions } from "./_NodeActions";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { randomID } from "@/Core/Utils/MiscUtils";
import { ILoadMolParams } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/Types";
import { getFormatInfoGivenType } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";

/**
 * TreeNodeList class
 */
export class TreeNodeList {
    public _nodes: TreeNode[] = [];
    private _filters: TreeNodeListFilters;
    private _nodeActions: TreeNodeListNodeActions;
    private _copy: TreeNodeListCopies;
    public triggerId = ""; // Purpose of this is just to trigger reactivity if needed

    // This is to keep track of titles. It takes a surprisingly long time to
    // generate this set on the fly.
    // private _titles: Set<string> = new Set<string>();

    /**
     * Constructor.
     *
     * @param  {TreeNode[]} [nodes] The nodes to add to the list.
     */
    constructor(nodes?: TreeNode[]) {
        if (nodes) {
            this._nodes = nodes;
            // this._updateTitles();
        }

        this._filters = new TreeNodeListFilters(this);
        this._nodeActions = new TreeNodeListNodeActions(this);
        this._copy = new TreeNodeListCopies(this);

        // For chaining
        return this;
    }

    /**
     * Triggers reactivity. This is useful on rare occasions you need to trigger
     * reactivity explicitly. Tested on the main, root node. May work on others.
     */
    public triggerReactivity() {
        this.triggerId = randomID();

        this.nodes = this.nodes.map((n) => n);

        for (const node of this.nodes) {
            node.triggerReactivity();
            node.nodes?.triggerReactivity();
        }
    }

    // private _updateTitles(): void {
    //     this._titles = new Set<string>();
    //     this._nodes.forEach((node) => {
    //         this._titles.add(node.title);
    //     });
    // }

    /**
     * Gets the filters.
     *
     * @returns {TreeNodeListFilters}  The filters.
     */
    public get filters(): TreeNodeListFilters {
        return this._filters;
    }

    /**
     * Gets the copy actions.
     *
     * @returns {TreeNodeListCopies}  The copy actions.
     */
    public get copy(): TreeNodeListCopies {
        return this._copy;
    }

    /**
     * Gets the nodes as an array.
     *
     * @returns {TreeNode[]}  The nodes.
     */
    public get nodes(): TreeNode[] {
        return this._nodes;
    }

    /**
     * Sets the nodes.
     *
     * @param  {TreeNode[]} nodes  The nodes.
     */
    public set nodes(nodes: TreeNode[]) {
        this._nodes = nodes;
        // this._updateTitles();
    }

    /**
     * An easy way to look up nodes in the descendency. Can be a list of
     * criteria (one criteria per level) or a single criteria.
     *
     * @param  {EasyCriterion[]|EasyCriterion} searchCriteria  The criteria.
     * @returns {TreeNodeList}  The nodes that match the criteria.
     */
    public lookup(
        searchCriteria: EasyCriterion[] | EasyCriterion
    ): TreeNodeList {
        return this._filters.lookup(searchCriteria);
    }

    /**
     * Add a node to the list.
     *
     * @param  {TreeNode} node  The node to add.
     */
    public push(node: TreeNode) {
        // let newTitle = node.title;

        // if (this._titles.size > 0) {
        //     // Does node.title already exist in this list? If so, rename it.
        //     let idx = 0;
        //     while (this._titles.has(newTitle)) {
        //         newTitle = node.title + " (" + ++idx + ")";
        //     }
        //     this._titles.add(newTitle);
        // }

        // node.title = newTitle;

        // // Throw warning if title already exists.
        // const titles = this._nodes.map((n) => n.title);

        // console.log("titles", titles);

        // // If the title already exists, throw warning.
        // if (titles.includes(node.title)) {
        //     const msg =
        //         "Warning: Node with title " +
        //         node.title +
        //         " already exists. When adding nodes, try to make them unique to avoid problems in the data panel!";
        //     // if (GlobalVars.isLocalHost) {
        //     //     alert(msg);
        //     // }
        //     console.warn(msg);
        // }

        this._nodes.push(node);
    }

    /**
     * Gets the number of nodes in this list.
     *
     * @returns {number}  The number of nodes.
     */
    public get length(): number {
        return this._nodes.length;
    }

    /**
     * Gets the node at the specified index.
     *
     * @param  {number} index  The index.
     * @returns {TreeNode}  The node.
     */
    public get(index: number): TreeNode {
        return this._nodes[index];
    }

    /**
     * Sets the node at the specified index.
     *
     * @param  {number}   index  The index.
     * @param  {TreeNode} node   The node.
     */
    public set(index: number, node: TreeNode) {
        this._nodes[index] = node;
    }

    /**
     * Iterates through the nodes.
     *
     * @param {Function} func  The function to call for each node.
     */
    public forEach(func: (node: TreeNode, index: number) => void) {
        for (let i = 0; i < this._nodes.length; i++) {
            func(this._nodes[i], i);
        }
    }

    /**
     * Filters the nodes.
     *
     * @param  {Function} func  The function to call for each node. If the
     *                          function returns true, the node is included in
     *                          the result.
     * @returns {TreeNodeList}  The filtered nodes.
     */
    public filter(
        func: (node: TreeNode, index: number, array: any) => boolean
    ): TreeNodeList {
        return new TreeNodeList(this._nodes.filter(func));
    }

    /**
     * Gets the first node in the list that matches the specified criteria.
     *
     * @param  {Function} func  The function to call for each node. If the
     *                          function returns true, the node is included in
     *                          the result.
     * @returns {TreeNode|undefined}  The first node that matches the criteria,
     *     or undefined if no nodes match the criteria.
     */
    public find(
        func: (node: TreeNode, index?: number, array?: any) => boolean
    ): TreeNode | undefined {
        return this._nodes.find(func);
    }

    /**
     * Maps the nodes to a new array.
     *
     * @param  {Function} func  The function to call for each node. The function
     *                          should return the new value for the node.
     * @returns {any[]}  The mapped values.
     */
    public map(
        func: (node: TreeNode, index?: number, array?: any) => any
    ): any[] {
        return this._nodes.map(func);
    }

    /**
     * Removes the first node in the list and returns it.
     *
     * @returns {TreeNode|undefined}  The node that was removed, or undefined if
     *     the list is empty.
     */
    public shift(): TreeNode | undefined {
        // const firstElement = this._nodes.shift();
        // if (firstElement !== undefined) {
        //     this._titles.delete(firstElement.title);
        // }
        return this._nodes.shift();
    }

    /**
     * Inserts new elements at the start of the list, and returns the new length
     * of the list.
     *
     * @param  {TreeNode} node  The node to insert.
     * @returns {number}  The new length of the list.
     */
    public unshift(node: TreeNode): number {
        // this._titles.add(node.title);
        return this._nodes.unshift(node);
    }

    /**
     * Removes the last element from the list and returns it. If the list is
     * empty, undefined is returned and the list is not modified.
     *
     * @returns {TreeNode|undefined}  The node that was removed, or undefined if
     *     the list is empty.
     */
    public pop(): TreeNode | undefined {
        // const lastElement = this._nodes.pop();
        // if (lastElement !== undefined) {
        //     this._titles.delete(lastElement.title);
        // }
        return this._nodes.pop();
    }

    /**
     * Adds all the nodes in the specified list to this list. Acts in place, but
     * also returns this list for chaining.
     *
     * @param  {TreeNodeList} nodeList  The list of nodes to add.
     * @returns {TreeNodeList}  This list.
     */
    public extend(nodeList: TreeNodeList): TreeNodeList {
        nodeList.forEach((node: TreeNode) => {
            this.push(node);
        });
        return this;
    }

    /**
     * Calls the specified callback function for all the elements in the list.
     * The return value of the callback function is the accumulated result, and
     * is provided as an argument in the next call to the callback function.
     *
     * @param  {Function} func            The function to call for each node.
     *                                    The function should return the new
     *                                    value for the accumulator.
     * @param  {any}      [initialValue]  The initial value for the accumulator.
     * @returns {any}  The accumulated result.
     */
    public reduce(
        func: (
            accumulator: any,
            node: TreeNode,
            index?: number,
            array?: any
        ) => any,
        initialValue?: any
    ): any {
        return this._nodes.reduce(func, initialValue);
    }

    /**
     * Tests whether at least one element in the list passes the test
     * implemented by the provided function.
     *
     * @param  {Function} func  The function to test for each element.
     * @returns {boolean}  `true` if the callback function returns a truthy
     *         value for at least one element in the list. Otherwise, `false`.
     */
    public some(
        func: (node: TreeNode, index?: number, array?: TreeNode[]) => boolean
    ): boolean {
        return this._nodes.some(func);
    }

    /**
     * Sorts the nodes.
     *
     * @param {Function} func  The function to call for each node. The function
     *                         should return a number indicating the sort order.
     * @returns {TreeNodeList}  This list, sorted (for chaining).
     */
    public sort(func: (a: TreeNode, b: TreeNode) => number): TreeNodeList {
        this._nodes.sort(func);
        return this;
    }

    /**
     * Gets the nodes as an array.
     *
     * @returns {TreeNode[]}  The nodes.
     */
    public toArray(): TreeNode[] {
        return this._nodes;
    }

    /**
     * Gets the nodes as a serialized array of ITreeNode interfaces. Good for
     * saving to JSON or passing to webworker.
     *
     * @returns {ITreeNode[]}  The serialized nodes.
     */
    public serialize(): ITreeNode[] {
        return this._nodes.map((node: TreeNode) => {
            return node.serialize();
        });
    }

    /**
     * Clears the list of nodes.
     */
    public clear() {
        this._nodes = [];
        // this._titles.clear();
    }

    /**
     * Loads a molecule into the list.
     *
     * @param  {ILoadMolParams} params  The parameters for loading the molecule.
     * @returns {Promise<void | TreeNodeList>}  A promise that resolves with the
     *     list of new nodes, or undefined on failure.
     */
    public async loadFromFileInfo(
        params: ILoadMolParams
    ): Promise<void | TreeNodeList> {
        const fileName = params.fileInfo.name;

        // Do not add to tree
        params.addToTree = false;

        const treeNodeList: void | TreeNodeList = await _parseMoleculeFile(
            params
        );

        if (!treeNodeList || treeNodeList.length === 0) {
            // Apparently wasn't possible to parse molecule.
            // TODO: Show error message?
            return;
        }

        const initialCompoundsVisible = await getSetting(
            "initialCompoundsVisible"
        );

        // Expand some of the nodes so the user can see what was loaded.
        treeNodeList._nodes[0].visible = true;

        // Get all the terminal nodes.
        const terminalNodes = treeNodeList.terminals;

        // Rename the nodes in treeNodeList and make some of them
        // invisible.
        for (let i = 0; i < terminalNodes.length; i++) {
            const node = terminalNodes.get(i);
            // If "undefined" in title, rename
            if (node.title.indexOf("undefined") >= 0) {
                const { basename } = getFileNameParts(fileName);
                node.title = basename + ":" + (i + 1).toString();
            }
            node.visible = i < initialCompoundsVisible;
            // node.treeExpanded = false;
        }

        // If there are more than MAX_VISIBLE nodes, let user know some not visible.
        if (terminalNodes.length > initialCompoundsVisible) {
            // Expand trees to make the user aware of hidden molecules.
            // NOTE: I decided against the below for consistency. Leave
            // commented out in case you want to revisit this.

            // treeNodeList._nodes[0].treeExpanded = true;
            // treeNodeList.lookup([0, "*"]).forEach((node: TreeNode) => {
            //     node.treeExpanded = true;
            // });
            // treeNodeList.lookup([0, "*", "*"]).forEach((node: TreeNode) => {
            //     node.treeExpanded = true;
            // });

            // A message helps too.
            messagesApi.popupMessage(
                "Some Molecules not Visible",
                `The ${fileName} file contained ${terminalNodes.length} molecules. Only ${initialCompoundsVisible} are initially shown for performance's sake. Use the Navigator to toggle the visibility of the remaining molecules.`,
                PopupVariant.Info,
                undefined,
                false,
                {}
            );
        }

        this.extend(treeNodeList);
        return treeNodeList;
    }

    /**
     * Remove a node of given id, as well as any childless nodes that result.
     * In-place operation.
     *
     * @param  {string | TreeNode | null} node  The id of the node to remove, or
     *                                          the node itself.
     */
    public removeNode(node: string | TreeNode | null) {
        // if (typeof node === "string") {
        //     // If it's a string
        //     this._titles.delete(node);
        // } else if (node) {
        //     // It's a TreeNode
        //     this._titles.delete(node.title);
        // }
        this._nodeActions.remove(node);
    }

    /**
     * Gets all the nodes, whether terminal or not.
     *
     * @returns {TreeNodeList}  The flat array of all nodes.
     */
    public get flattened(): TreeNodeList {
        return this._nodeActions.flattened;
    }

    /**
     * An alias for filters.onlyTerminal. Gets all the terminal nodes. You
     * access this offten enough that it's easier to add this alias.
     *
     * @returns {TreeNodeList}  All the terminal nodes.
     */
    public get terminals(): TreeNodeList {
        return this._filters.onlyTerminal;
    }

    /**
     * Convert this TreeNodeList to a specified molecular format.
     *
     * @param  {string}          targetExt      The extension of the format to
     *                                          convert to.
     * @param  {boolean}         [merge=true]  Whether to merge the models into
     *                                          a single PDB string.
     * @returns {FileInfo[]} The text-formatted (e.g., PDB, MOL2) strings.
     */
    public async toFileInfos(
        targetExt: string,
        merge = true
    ): Promise<FileInfo[]> {
        // Determine if in worker
        const inWorker =
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            typeof WorkerGlobalScope !== "undefined" &&
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            self instanceof WorkerGlobalScope;

        const formatInfo = getFormatInfoGivenType(targetExt);

        // Start spinner
        let spinnerId: any;
        if (!inWorker) {
            spinnerId = messagesApi.startWaitSpinner();
        }

        const fileInfos = await _convertTreeNodeList(this, targetExt, merge);

        // Update the molecule name in the fileInfo contents
        for (let i = 0; i < fileInfos.length; i++) {
            if (formatInfo && formatInfo.updateMolNameInContents) {
                fileInfos[i].contents = formatInfo.updateMolNameInContents(
                    fileInfos[i].contents,
                    this._nodes[i].title
                );
            }
        }

        if (!inWorker) {
            messagesApi.stopWaitSpinner(spinnerId);
        }
        return fileInfos;
    }

    /**
     * A helper function tht adds all the nodes in this list to the molecules in
     * the vuex store.
     *
     * @param {string | null} tag  The tag to add to the main tree.
     * @param {boolean} [reassignIds=true] Whether to reassign IDs to the new
     *             nodes to avoid collisions. Set to false
     *             when loading a saved session.
     */
    public addToMainTree(tag: string | null, reassignIds = true) {
        for (const node of this._nodes) {
            node.addToMainTree(tag, reassignIds);
        }
    }

    /**
     * A helper function that creates a new TreeNodeList. This is useful for
     * avoiding circular dependencies.
     *
     * @param  {TreeNode[]} [nodes=[]]  The nodes to add to the new list.
     * @returns {TreeNodeList}  The new list.
     */
    public newTreeNodeList(nodes: TreeNode[] = []): TreeNodeList {
        // To avoid circular dependencies
        return new TreeNodeList(nodes);
    }

    /**
     * Merges all the nodes in this list into a single node. This is useful for
     * converting a list of molecules into a single molecule.
     *
     * @param  {string} [topLevelTitle=undefined]  The title of the top-level
     *                                             node. If undefined, the title
     *                                             of the first node is used.
     * @returns {TreeNodeList}  The new list.
     */
    public merge(topLevelTitle?: string): TreeNodeList {
        // This is where the title is being set to first item. Bad if multiple
        // frames!
        const firstNode = this._nodes[0].shallowCopy();

        if (topLevelTitle) {
            firstNode.title = topLevelTitle;
        }

        for (let i = 1; i < this._nodes.length; i++) {
            const node = this._nodes[i];
            firstNode.mergeInto(node);
        }
        return new TreeNodeList([firstNode]);
    }
}
