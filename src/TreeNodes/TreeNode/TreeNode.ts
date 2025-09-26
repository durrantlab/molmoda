import { randomID } from "@/Core/Utils/MiscUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { _parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import {
    getMoleculesFromStore,
    pushToStoreList,
    setStoreVar,
} from "@/Store/StoreExternalAccess";
import type { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import {
    TreeNodeType,
    SelectedType,
    ITreeNodeData,
    IAtom,
    IRegion,
    IBox,
    RegionType,
} from "../../UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "../TreeNodeList/TreeNodeList";
import { newTreeNodeList, setupMakerFuncs } from "../TreeNodeMakers";
import { TreeNodeAncestry } from "./_Ancestry";
import { TreeNodeDescriptions } from "./_Descriptions";
import { store } from "@/Store";
import { visualizationApi } from "@/Api/Visualization";
import { expandAndShowAllMolsInTree } from "@/Testing/SetupTests";
import { IFileInfo } from "@/FileSystem/Types";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { ILoadMolParams } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/Types";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
import { updateStylesInViewer } from "@/Core/Styling/StyleManager";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { isTest } from "@/Core/GlobalVars";
import { _convertTreeNodeList } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeList";
// Deserialized (object-based) version of TreeNode
export interface ITreeNode {
    // Properties common to both non-terminal and terminal nodes.
    title: string; // appears in tree
    type?: TreeNodeType;
    id?: string; // random id for nodes
    parentId?: string; // parent id for tree
    src?: string; // typically, the file name
    treeExpanded: boolean;
    visible: boolean;
    selected: SelectedType; // Not bool (string enum). "false" vs. false.
    focused: boolean;
    viewerDirty: boolean; // triggers 3dmoljs viewer
    data?: { [key: string]: ITreeNodeData }; // key is title of chart, etc.
    tags?: string[]; // tags for this node. Mostly just plugin ids of plugins used to generate this node.

    // These are specifically for terminal nodes
    styles?: ISelAndStyle[]; // styles and selections for this node
    model?: IAtom[] | GLModel | IFileInfo;
    region?: IRegion;

    // These are specifically for non-terminal nodes
    nodes?: TreeNodeList; // Next level down in menu. So if molecule,
}

/**
 * TreeNode class.
 */
export class TreeNode {
    // Properties common to both non-terminal and terminal nodes.
    title: string; // appears in tree
    type?: TreeNodeType;
    id?: string; // random id for nodes
    parentId?: string; // parent id for tree
    src?: string; // typically, the file name
    treeExpanded: boolean;
    _visible: boolean;
    _selected: SelectedType; // Not bool (string enum). "false" vs. false.
    focused: boolean;
    viewerDirty: boolean; // triggers 3dmoljs viewer
    data?: { [key: string]: ITreeNodeData }; // key is title of chart, etc.
    tags?: string[]; // tags for this node. Mostly just plugin ids of plugins used to generate this node.

    // These are specifically for non-terminal nodes
    nodes?: TreeNodeList; // Next level down in menu. So if molecule,

    // These are specifically for terminal nodes
    model?: IAtom[] | GLModel | IFileInfo; // IAtom in worker, GLMoldel in main thread
    styles?: ISelAndStyle[]; // styles and selections for this node
    region?: IRegion;

    public triggerId = ""; // Purpose of this is just to trigger reactivity if needed

    private _descriptions: TreeNodeDescriptions;
    private _ancestry: TreeNodeAncestry;

    /**
     * The constructor.
     *
     * @param  {ITreeNode} params  The parameters.
     */
    constructor(params: ITreeNode) {
        // this._title = this.fixTitle(params.title);
        this.title = params.title;
        this.type = params.type;

        // If no id, create one.
        if (!params.id) {
            params.id = randomID();
        }
        this.id = params.id;

        this.parentId = params.parentId;
        this.src = params.src;
        this.treeExpanded = params.treeExpanded;
        this._visible = params.visible;
        this._selected = params.selected;
        this.focused = params.focused;
        this.viewerDirty = params.viewerDirty;
        this.data = params.data;
        this.tags = params.tags;
        this.nodes = params.nodes;
        this.model = params.model;
        this.styles = params.styles;
        this.region = params.region;

        this._descriptions = new TreeNodeDescriptions(this);
        this._ancestry = new TreeNodeAncestry(this);

        // For chaining
        return this;
    }

    /**
     * Get the selected state.
     *
     * @returns {SelectedType}  The selected state.
     */
    get selected(): SelectedType {
        return this._selected;
    }

    /**
     * Set the selected state.
     *
     * @param {SelectedType} val  The selected state.
     */
    set selected(val: SelectedType) {
        // Set to dirty to trigger rerender of molecule (with yellow outline to
        // indicate selected).
        this.viewerDirty = true;

        this._selected = val;
    }

    /**
     * Triggers reactivity. This is useful on rare occasions you need to trigger
     * reactivity explicitly. Tested on the main, root node. May work on others.
     */
    public triggerReactivity() {
        this.triggerId = randomID();
    }

    // private fixTitle(title: string): string {
    //     if (title === undefined) {
    //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //         // @ts-ignore
    //         return undefined;
    //     }
    //     // If there is "(" in the title, update it to : (trying to enforce
    //     // consistency).
    //     title = title.replace("(", ":");
    //     title = title.replace(")", ":");
    //     while (title.indexOf(" :") !== -1) {
    //         title = title.replace(" :", ":");
    //     }
    //     while (title.indexOf(": ") !== -1) {
    //         title = title.replace(": ", ":");
    //     }

    //     title = title.trim();

    //     // If ends in :, remove
    //     if (title.endsWith(":")) {
    //         title = title.slice(0, title.length - 1);
    //     }

    //     return title;
    // }

    // public get title(): string {
    //     return this._title;
    // }

    // public set title(val: string) {
    //     val = this.fixTitle(val);
    //     this._title = val;
    // }

    /**
     * Get whether this node is visible.
     *
     * @returns {boolean}  Whether this node is visible.
     */
    public get visible(): boolean {
        return this._visible;
    }

    /**
     * Set whether this node is visible.
     *
     * @param {boolean} val  Whether this node is visible.
     */
    public set visible(val: boolean) {
        // Make this one visible as well as all its children.
        this.nodes?.flattened.forEach((nd) => {
            nd._visible = val;
        });
        this._visible = val;
    }

    /**
     * Set this node's visibility without affecting its children.
     */
    public set visibleWithoutChildren(val: boolean) {
        // Regular visible propogates to children. This just affects this node.
        this._visible = val;
    }

    /**
     * Get the descriptions subclass.
     *
     * @returns {TreeNodeDescriptions}  The descriptions subclass.
     */
    public get descriptions(): TreeNodeDescriptions {
        return this._descriptions;
    }

    /**
     * Get the parent node of the current node.
     *
     * @returns {TreeNode | undefined}  The parent node, or undefined if there
     *     is no parent.
     */
    public get parentTreeNode(): TreeNode | undefined {
        const ancestors = this.getAncestry(store.state.molecules);
        return ancestors.get(ancestors.length - 2);
    }

    /**
     * Serialize the TreeNode (removes objects).
     *
     * @returns {ITreeNode}  The serialized TreeNode.
     */
    public serialize(): ITreeNode {
        const obj: { [key: string]: any } = {};
        for (const key in this) {
            if (key === "nodes" && this.nodes) {
                obj["nodes"] =
                    (this.nodes as TreeNodeList).serialize !== undefined
                        ? (this.nodes as TreeNodeList).serialize()
                        : this.nodes;
            } else if (key === "model" && this.model) {
                // If stored as GLModel (depreciated), convert to IAtom[] so
                // serializable.
                if ((this.model as GLModel).selectedAtoms !== undefined) {
                    obj["model"] = (this.model as GLModel).selectedAtoms({});

                    // Remove some data that's not likely needed to reduce file
                    // size.
                    const keysToRemove = [
                        "pdbline",
                        "uMat",
                        // "intersectionShape",  // This is needed
                    ];
                    obj["model"] = obj["model"].map((atom: IAtom) => {
                        for (const key of keysToRemove) {
                            if ((atom as any)[key]) {
                                delete (atom as any)[key];
                            }
                        }
                        return atom;
                    });
                } else {
                    obj["model"] = JSON.parse(JSON.stringify(this.model));
                }
            } else {
                const element = this[key];
                if (element !== undefined) {
                    if (key.startsWith("_")) {
                        // Skip this one
                        continue;
                    }
                    obj[key] = JSON.parse(JSON.stringify(element));
                }
            }
        }

        // You must add "visible" manually because it's a getter, not a
        // property.
        obj["visible"] = this.visible;

        return obj as ITreeNode;
    }

    /**
     * Shallow copy the TreeNode. Doesn't recreate GLModel objects, for example.
     *
     * @returns {TreeNode}  The shallow copy.
     */
    public shallowCopy(): TreeNode {
        const prop: { [key: string]: any } = {};
        for (const key in this) {
            prop[key] = this[key];
        }

        if (prop.nodes) {
            prop.nodes = (prop.nodes as TreeNodeList).copy.shallow;
        }

        return new TreeNode(prop as ITreeNode);
    }

    /**
     * Clears the children of the node.
     */
    public clearChildren() {
        if (this.nodes) {
            this.nodes.clear();
        }
    }

    /**
     * Get a nodes ancestory. First element is most distant ancestor (greatest
     * grandparent), and last is this node itself.
     *
     * @param  {TreeNodeList}  [mols=undefined]  The list of molecules to
     *                                           search. If undefined, uses all
     *                                           molecules.
     * @returns {TreeNodeList}  The list of nodes in the ancestory.
     */
    public getAncestry(mols?: TreeNodeList): TreeNodeList {
        if (mols === undefined) {
            mols = getMoleculesFromStore();
        }

        return this._ancestry.getAncestry(mols);
    }

    /**
     * Convert this TreeNode to a specified molecular format.
     *
     * @param  {string}    targetExt   The extension of the format to
     *            convert to.
     * @param {boolean} [considerDescendants=false] If true and this is a container node,
     *            its descendants will be merged into a single file.
     * @returns {Promise<FileInfo>} The text-formatted (e.g., PDB, MOL2) string as a FileInfo object.
     */
    public toFileInfo(
        targetExt: string,
        considerDescendants = false
    ): Promise<FileInfo> {
        let nodesToConvert: TreeNodeList;
        let merge = false;
        if (this.model) {
            // It's a terminal node with a model. Always convert just this node.
            nodesToConvert = new TreeNodeList([this]);
            merge = false;
        } else if (this.nodes && this.nodes.terminals.length > 0) {
            // It's a container node.
            if (considerDescendants) {
                // Get all its terminal descendants and merge them.
                nodesToConvert = this.nodes.terminals;
                merge = true;
            } else {
                // Default behavior for a container: cannot be converted directly.
                return Promise.reject(
                    new Error(
                        `Cannot convert container node "${this.title}" directly. To convert its contents, set considerDescendants to true.`
                    )
                );
            }
        } else {
            // It's an empty or non-convertible node.
            return Promise.reject(
                new Error(
                    `Node "${this.title}" has no model or descendant nodes with models to convert.`
                )
            );
        }
        return _convertTreeNodeList(nodesToConvert, targetExt, merge)
            .then((fileInfos: FileInfo[]) => {
                if (fileInfos.length === 0) {
                    // This can happen if conversion yields no output.
                    throw new Error(
                        `Conversion of node "${this.title}" to "${targetExt}" resulted in an empty file.`
                    );
                }
                return fileInfos[0];
            })
            .catch((err: Error) => {
                throw err;
            });
    }

    /**
     * Gets the chain of a given tree node. If the tree node has no model, the
     * first available chain is returned. If the tree node has a model, the
     * first atom's chain is returned. If the first atom has no chain, the first
     * available chain is returned.
     *
     * @param  {TreeNode} treeNode         The tree node.
     * @param  {string[]} availableChains  The available chains.
     * @returns {string}  The chain.
     */
    private static _getChain(
        treeNode: TreeNode,
        availableChains: string[]
    ): string {
        let chain: string | undefined = undefined;

        if (!treeNode.model) {
            // If there's no model, use first available chain.
            chain = availableChains.shift();
        } else {
            const firstAtom = makeEasyParser(treeNode.model).getAtom(0);
            if (!firstAtom) {
                // If there are no atoms in the model, use first
                // available chain.
                chain = availableChains.shift();
            } else {
                const firstAtomChain = firstAtom.chain;
                if (firstAtomChain === "" || firstAtomChain === undefined) {
                    // If the first atom has no chain, use first
                    // available chain.
                    chain = availableChains.shift();
                } else if (availableChains.indexOf(firstAtomChain) === -1) {
                    // If the first atom's chain is not available, use
                    // first available chain.
                    chain = availableChains.shift();
                } else {
                    // Use the first atom's chain.
                    chain = firstAtomChain;
                }
            }
        }

        return chain as string;
    }

    /**
     * Given a list of file infos, load them all into a tree, but position them
     * in type/chain categories.
     *
     * @param  {TreeNode[]} treeNodes                      The tree nodes to
     *                                                     organize. Tree node
     *                                                     rather than FileInfo
     *                                                     because the category
     *                                                     is needed.
     * @param  {boolean}    [divideCompoundsByChain=true]  Whether to divide
     *                                                     compounds by chain.
     *                                                     If false, all
     *                                                     compounds are put in
     *                                                     the same chain node.
     * @returns {TreeNode}  The root tree node of the loaded tree.
     */
    public static loadHierarchicallyFromTreeNodes(
        treeNodes: TreeNode[],
        divideCompoundsByChain = true
    ): TreeNode {
        // Consider only the terminal nodes
        const allTreeNodes: TreeNode[] = [];
        for (const treeNode of treeNodes) {
            if (treeNode.nodes) {
                const terminalNodes = treeNode.nodes.terminals;

                // If the terminal nodes are titled "undefined:undefined", use the
                // title from the treeNode.
                const nodes = terminalNodes._nodes;
                if (nodes.length === 1) {
                    nodes[0].title = treeNode.title;
                } else {
                    // Add index
                    for (let i = 0; i < nodes.length; i++) {
                        nodes[i].title = `${treeNode.title}:${i + 1}`;
                    }
                }

                allTreeNodes.push(...nodes);
            } else {
                // This is a terminal node
                allTreeNodes.push(treeNode);
            }
        }

        // Divide the nodes into categories. For now, supporting only Protein
        // and Compounds. TODO: Expand to all possible categories.
        const categories: { [key: string]: any } = {};
        for (const treeNode of allTreeNodes) {
            if (treeNode.type === TreeNodeType.Compound) {
                if (!categories["Compounds"]) {
                    categories["Compounds"] = [];
                }
                categories["Compounds"].push(treeNode);
            } else if (treeNode.type === TreeNodeType.Protein) {
                if (!categories["Protein"]) {
                    categories["Protein"] = [];
                }
                categories["Protein"].push(treeNode);
            }
        }

        // Further divide the Compounds into chains. Proteins not so divide
        // because model node is the chain, but multiple compounds can belong to
        // same chain.
        if (categories["Compounds"]) {
            if (divideCompoundsByChain) {
                const compounds = categories["Compounds"];
                const newCompounds: { [key: string]: TreeNode[] } = {};
                for (const treeNode of compounds) {
                    const chain = TreeNode._getChain(treeNode, ["A"]);
                    if (!newCompounds[chain]) {
                        newCompounds[chain] = [];
                    }
                    newCompounds[chain].push(treeNode);
                }
                categories["Compounds"] = newCompounds;
            } else {
                categories["Compounds"] = {
                    A: categories["Compounds"],
                };
            }
        }

        // Create the root node
        const rootNode = new TreeNode({
            title: "Root Node", // Should be renamed
            treeExpanded: false,
            visible: true,
            selected: SelectedType.False,
            focused: false,
            viewerDirty: true,
            nodes: new TreeNodeList([]),
        });

        for (const title of ["Protein", "Compounds"]) {
            const type =
                title === "Protein"
                    ? TreeNodeType.Protein
                    : TreeNodeType.Compound;

            if (!categories[title]) {
                continue;
            }

            if (categories[title].length === 0) {
                continue;
            }

            // The node named "Protein" or "Compounds"
            const categoryNode = new TreeNode({
                title: title,
                treeExpanded: false,
                visible: true,
                selected: SelectedType.False,
                focused: false,
                viewerDirty: true,
                type: type,
                nodes: new TreeNodeList([]),
            });

            rootNode.nodes?.push(categoryNode);

            if (title === "Protein") {
                const availableChainsOrig: string[] = [];
                for (let i = 0; i < 26; i++) {
                    availableChainsOrig.push(String.fromCharCode(65 + i));
                }

                let availableChains: string[] = [];

                for (const treeNode of categories[title]) {
                    if (availableChains.length === 0) {
                        availableChains = availableChainsOrig.slice();
                    }

                    // Chains contain models
                    const chain = TreeNode._getChain(treeNode, availableChains);
                    treeNode.title = chain as string;
                    categoryNode.nodes?.push(treeNode);
                }
            } else if (title === "Compounds") {
                for (const chain of Object.keys(categories[title])) {
                    const chainNode = new TreeNode({
                        title: chain as string,
                        treeExpanded: false,
                        visible: true,
                        selected: SelectedType.False,
                        focused: false,
                        viewerDirty: true,
                        type: type,
                        nodes: new TreeNodeList(categories[title][chain]),
                    });
                    categoryNode.nodes?.push(chainNode);
                }
            }

            // // The one named "A" or whatever the chain is.
            // const chainNode = new TreeNode({
            //     title: chain as string,
            //     treeExpanded: false,
            //     visible: true,
            //     selected: SelectedType.False,
            //     focused: false,
            //     viewerDirty: true,
            //     type: type,
            //     nodes: new TreeNodeList([treeNode])
            // });

            // categoryNode.nodes?.push(chainNode);

            // // Add the nodes to the chain node. Contain models.
            // chainNode.nodes = new TreeNodeList(categories[title]);
        }

        return rootNode;
    }

    /**
     * Get a new TreeNode from a file info object.
     *
     * @param  {ILoadMolParams} params  The parameters.
     * @returns {Promise<void | TreeNode>}  The new TreeNode.
     */
    public static async loadFromFileInfo(
        params: ILoadMolParams
    ): Promise<void | TreeNode> {
        // NOTE: static

        // Do not add to the tree
        params.addToTree = false;

        const treeNodeList = await _parseMoleculeFile(params);

        if (treeNodeList === undefined) {
            return undefined;
        }

        return treeNodeList.get(0);
    }

    /**
     * Creates a new TreeNode. Putting this in a function here helps with circular
     * dependencies.
     *
     * @param  {ITreeNode} params  The parameters to create the TreeNode with.
     * @returns {TreeNode}  The new TreeNode.
     */
    public newTreeNode(params: ITreeNode): TreeNode {
        // To help with circular dependencies.
        return new TreeNode(params);
    }

    /**
     * Get the depth of the tree (number of descendents).
     *
     * @returns {number}  The depth of the tree.
     */
    public get depth(): number {
        let maxDepthFound = 1;

        const recurse = (node: TreeNode, depthSoFar: number) => {
            if (node.nodes) {
                node.nodes.forEach((child: TreeNode) => {
                    recurse(child, depthSoFar + 1);
                });
            }
            if (depthSoFar > maxDepthFound) {
                maxDepthFound = depthSoFar;
            }
            return depthSoFar;
        };

        recurse(this, 1);

        return maxDepthFound;
    }

    /**
     * Merge another node into this one. In place.
     *
     * @param  {TreeNode} otherNode  The node to merge into this one.
     */
    public mergeInto(otherNode: TreeNode) {
        // Verify that both have the same depth
        // if (this.depth !== otherNode.depth) {
        //     throw new Error("Cannot merge nodes with different depths.");
        // }

        // if (this.nodes === undefined) {
        //     throw new Error("Cannot merge nodes with undefined children.");
        // }

        otherNode.nodes?.forEach((otherChild: TreeNode) => {
            const otherNodeType = otherChild.type;

            // Does this type exist in this node?
            const thisChild = this.nodes?.find((child: TreeNode) => {
                return child.type === otherNodeType;
            });
            if (thisChild === undefined) {
                // No, so just add it. Straightforward.
                otherChild.parentId = this.id;
                this.nodes?.push(otherChild);
            } else {
                // This one does have a child node of the same type.

                if (
                    thisChild.nodes === undefined &&
                    otherChild.nodes === undefined
                ) {
                    // They are both terminal nodes. Add as siblings.
                    otherChild.parentId = this.id;
                    this.nodes?.push(otherChild);
                } else {
                    // Not temrinal nodes, so need to merge each of the children
                    // in other one into this one.
                    thisChild.mergeInto(otherChild);
                }
            }
        });
    }

    /**
     * Assigns new ids to all nodes in the tree. This is useful when cloning a
     * tree, for example. This is done in place. It also fixed all parentIds.
     */
    reassignAllIds() {
        // Get all the nodes (flat).
        const allNodes = new TreeNodeList([this]).flattened;

        // Go through each node and assign a new id.
        allNodes.forEach((node: TreeNode) => {
            node.id = randomID();
        });

        // Go through each node that has children and assign the new parentIds.
        allNodes.forEach((node: TreeNode) => {
            if (node.nodes) {
                node.nodes.forEach((child: TreeNode) => {
                    child.parentId = node.id;
                });
            }
        });
    }

    /**
     * A helper function. Adds this node to the molecules in the vuex store.
     *
     * @param {string | null} tag       The tag to add to this
     *             node.
     * @param {boolean} [reassignIds=true]    Whether to reassign
     *             IDs to the new nodes
     *             to avoid collisions.
     *             Set to false when
     *             loading a saved
     *             session.
     * @param {boolean} [terminalNodeTitleRevisable=true] Whether the title of
     *             the terminal node
     *             should be revisable.
     *             Revised if there is
     *             only one terminal
     *             node. If you're adding
     *             nodes incrementally,
     *             good to set to false.
     * @param {boolean} [resetVisibilityAndSelection=true] Whether to make the molecule
     *            visible and unselected. Set to false
     *            when loading a saved session where these
     *            properties should be preserved.
     */
    public async addToMainTree(
        tag: string | null,
        reassignIds = true,
        terminalNodeTitleRevisable = true,
        resetVisibilityAndSelection = true
    ) {
        if (reassignIds) {
            this.reassignAllIds();
        }
        if (isTest) {
            // If it's a test, open it with all nodes expanded.
            expandAndShowAllMolsInTree();
        }
        // Get all nodes in the subtree to set selection and tags.
        const allNodesInSubtree = new TreeNodeList([this]).flattened;
        // Add tag if provided.
        if (tag) {
            allNodesInSubtree.forEach((node) => {
                if (node.tags === undefined) {
                    node.tags = [];
                }
                // Avoid adding duplicate tags.
                if (!node.tags.includes(tag)) {
                    node.tags.push(tag);
                }
            });
        }
        if (resetVisibilityAndSelection) {
            // Set visibility to true for this node and all its non-terminal children.
            allNodesInSubtree.forEach((node) => {
                if (node.nodes) {
                    // It's a container node
                    node.visible = true;
                }
            });
            this.visible = true;
            // For terminal nodes, make only the first few visible.
            const terminalNodes = this.nodes
                ? this.nodes.terminals
                : new TreeNodeList([]);
            if (this.model) {
                // This node is a terminal node itself.
                terminalNodes.push(this);
            }
            const initialCompoundsVisible = await getSetting(
                "initialCompoundsVisible"
            );
            terminalNodes.forEach((node, i) => {
                node.visible = i < initialCompoundsVisible;
            });
            // Ensure nodes are not selected when added.
            allNodesInSubtree.forEach((node) => {
                node.selected = SelectedType.False;
            });
        }
        // If this node has only one terminal node, and that terminal, prepend
        // the top-level title to the title of the terminal node.
        if (
            terminalNodeTitleRevisable &&
            this.nodes &&
            this.nodes.terminals.length === 1
        ) {
            this.nodes.terminals.get(0).title = `${this.title}:${
                this.nodes.terminals.get(0).title
            }`;
        }
        pushToStoreList("molecules", this);
        if (store.state.projectTitle === "") {
            const topAncestor = this.getAncestry(getMoleculesFromStore()).get(
                0
            );
            if (topAncestor && topAncestor.title) {
                setStoreVar("projectTitle", topAncestor.title);
            }
        }
        // If you add new molecules to the tree, focus on everything.
  const viewer = await visualizationApi.viewer;
        // Set the style according to the current user specs.
        updateStylesInViewer();

        viewer.zoomOnFocused();
    }

    /**
     * Gets the box surrounding the model.
     *
     * @param  {number} [padding=3.4]  The padding to add to the box.
     * @returns {IBox}  The box.
     */
    public getBoxRegion(padding = 3.4): IBox {
        // Note 3.4 is approximate vdw diameter of carbon.

        // Get all the nodes and subnodes with models (including this one).
        const nodesWithModels = newTreeNodeList([this]).filters.keepModels(
            true,
            true
        ).nodes;
        const xs: number[] = [];
        const ys: number[] = [];
        const zs: number[] = [];
        nodesWithModels.forEach((node: TreeNode) => {
            const model = node.model as GLModel;
            // Get atoms
            const { atoms } = makeEasyParser(model);
            xs.push(...atoms.map((atom: IAtom) => atom.x as number));
            ys.push(...atoms.map((atom: IAtom) => atom.y as number));
            zs.push(...atoms.map((atom: IAtom) => atom.z as number));
        });

        // Get min and max x, y, and z
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const minZ = Math.min(...zs);
        const maxZ = Math.max(...zs);

        // Get box center
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Try to get color of this node if you can find it.
        let color: string | undefined = undefined;
        if (this.styles && this.styles.length > 0) {
            for (const style of this.styles) {
                const colors = [
                    style.surface?.color,
                    style.sphere?.color,
                    style.cartoon?.color,
                    style.stick?.color,
                    style.line?.color,
                ];
                // Get first color in colors that is not undefined
                color = colors.find((c: string | undefined) => c !== undefined);
                if (color !== undefined) {
                    break;
                }
            }
        }
        if (color === undefined) {
            // If none of the styles can a color attribute set, just use red.
            color = "red";
        }

        return {
            type: RegionType.Box,
            center: [centerX, centerY, centerZ],
            opacity: 0.5,
            color: color,
            movable: true,
            dimensions: [
                maxX - minX + padding,
                maxY - minY + padding,
                maxZ - minZ + padding,
            ],
        } as IBox;
    }
}

/**
 * Defines the maker functions for TreeNode and TreeNodeList. This is done
 * here to avoid circular dependencies.
 */
export function defineMakerFuncs() {
    setupMakerFuncs(
        new TreeNode({} as ITreeNode).newTreeNode,
        new TreeNodeList([]).newTreeNodeList
    );
}
