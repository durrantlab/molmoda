import { messagesApi } from "@/Api/Messages";
import type { FileInfo } from "@/FileSystem/FileInfo";
import { _convertTreeNodeList } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeList";
import { _parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import type { ITreeNode, TreeNode } from "../TreeNode/TreeNode";
import { newTreeNode } from "../TreeNodeMakers";
import { TreeNodeListCopies } from "./_Copy";
import { EasyCriterion, TreeNodeListFilters } from "./_Filters";
import { TreeNodeListNodeActions } from "./_NodeActions";

/**
 * TreeNodeList class
 */
export class TreeNodeList {
    public _nodes: TreeNode[] = [];
    private _filters: TreeNodeListFilters;
    private _nodeActions: TreeNodeListNodeActions;
    private _copy: TreeNodeListCopies;

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
        //     debugger;
        //     // Does node.title already exist in this list? If so, rename it.
        //     let idx = 0;
        //     while (this._titles.has(newTitle)) {
        //         newTitle = node.title + " (" + ++idx + ")";
        //     }
        //     this._titles.add(newTitle);
        // }

        // node.title = newTitle;

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
     * @param  {FileInfo} fileInfo  The file to load.
     * @returns {Promise<void | TreeNodeList>}  A promise that resolves with the
     *     list of nodes, or undefined on failure.
     */
    public load(fileInfo: FileInfo): Promise<void | TreeNodeList> {
        const fileName = fileInfo.name;
        return _parseMoleculeFile(
            fileInfo,
            false // don't add to tree
        )
            .then((treeNodeList: void | TreeNodeList) => {
                if (!treeNodeList) {
                    // Apparently wasn't possible to parse molecule.
                    // TODO: Show error message?
                    return;
                }

                // Rename the nodes in treeNodeList and make some of them
                // invisible.
                for (let i = 0; i < treeNodeList.length; i++) {
                    const node = treeNodeList.get(i);
                    node.title = fileName + ":" + (i + 1).toString();
                    node.visible = i < 5;
                    node.treeExpanded = false;
                }

                // If there are more than 5 nodes, let user know some not visible.
                if (treeNodeList.length > 5) {
                    messagesApi.popupMessage(
                        "Some Molecules not Visible",
                        `The ${fileName} file contained ${treeNodeList.length} molecules. Only five are initially shown for performance's sake. Use the Navigator to toggle the visibility of the remaining molecules.`,
                        PopupVariant.Info
                    );
                }

                // Place all these nodes under a single root node if necessary.
                let treeNodeListWithRootNode: TreeNodeList;
                if (treeNodeList.length === 1) {
                    // This part of if then makes 1xdn not load. Need to investigate.
                    treeNodeListWithRootNode = treeNodeList;
                } else {
                    treeNodeListWithRootNode = new TreeNodeList();
                    const rootNode = newTreeNode({
                        title: fileName,
                        visible: true,
                        treeExpanded: true,
                        viewerDirty: true,
                        selected: SelectedType.False,
                        focused: false,
                    } as TreeNode);
                    treeNodeListWithRootNode.push(rootNode);
                    rootNode.nodes = treeNodeList;
                }

                if (treeNodeListWithRootNode) {
                    this.extend(treeNodeListWithRootNode);
                }
                return treeNodeListWithRootNode;
            })
            .catch((error: Error) => {
                throw error;
            });
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
     * @param  {boolean}         [merge=false]  Whether to merge the models into
     *                                          a single PDB string.
     * @returns {FileInfo[]} The text-formatted (e.g., PDB, MOL2) strings.
     */
    public toFileInfos(targetExt: string, merge = true): Promise<FileInfo[]> {
        // Start spinner
        messagesApi.waitSpinner(true);
        return _convertTreeNodeList(this, targetExt, merge).then(
            (fileInfos: FileInfo[]) => {
                messagesApi.waitSpinner(false);
                return fileInfos;
            }
        );
    }

    /**
     * A helper function tht adds all the nodes in this list to the molecules in
     * the vuex store.
     */
    public addToMainTree() {
        getMoleculesFromStore().extend(this);
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
}