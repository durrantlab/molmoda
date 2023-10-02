import { randomID } from "@/Core/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { _convertTreeNodeList } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeList";
import { _parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import type { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import {
    TreeNodeType,
    SelectedType,
    ITreeNodeData,
    IAtom,
    IStyle,
    IRegion,
    IBox,
    RegionType,
} from "../../UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "../TreeNodeList/TreeNodeList";
import { newTreeNodeList, setupMakerFuncs } from "../TreeNodeMakers";
import { TreeNodeAncestry } from "./_Ancestry";
import { TreeNodeDescriptions } from "./_Descriptions";
import { store } from "@/Store";
import * as api from "@/Api";
import * as SetupTests from "@/Testing/SetupTests";
import { expandAndShowAllMolsInTree } from "@/Testing/SetupTests";

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

    // These are specifically for terminal nodes
    styles?: IStyle[]; // styles and selections for this node
    model?: IAtom[] | GLModel;
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
    selected: SelectedType; // Not bool (string enum). "false" vs. false.
    focused: boolean;
    viewerDirty: boolean; // triggers 3dmoljs viewer
    data?: { [key: string]: ITreeNodeData }; // key is title of chart, etc.

    // These are specifically for non-terminal nodes
    nodes?: TreeNodeList; // Next level down in menu. So if molecule,

    // These are specifically for terminal nodes
    model?: IAtom[] | GLModel; // IAtom in worker, GLMoldel in main thread
    styles?: IStyle[]; // styles and selections for this node
    region?: IRegion;

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
        this.selected = params.selected;
        this.focused = params.focused;
        this.viewerDirty = params.viewerDirty;
        this.data = params.data;
        this.nodes = params.nodes;
        this.model = params.model;
        this.styles = params.styles;
        this.region = params.region;

        this._descriptions = new TreeNodeDescriptions(this);
        this._ancestry = new TreeNodeAncestry(this);

        // For chaining
        return this;
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
                if ((this.model as GLModel).selectedAtoms !== undefined) {
                    obj["model"] = (this.model as GLModel).selectedAtoms({});

                    // Remove some data that's not likely needed to reduce file
                    // size.
                    const keysToRemove = [
                        "pdbline",
                        "uMat",
                        "intersectionShape",
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
     * @param  {string}          targetExt      The extension of the format to
     *                                          convert to.
     * @returns {FileInfo} The text-formatted (e.g., PDB, MOL2) strings.
     */
    public toFileInfo(targetExt: string): Promise<FileInfo> {
        return _convertTreeNodeList(new TreeNodeList([this]), targetExt, false)
            .then((fileInfos: FileInfo[]) => {
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
            const firstAtom = (treeNode.model as GLModel).selectedAtoms({})[0];
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
                    "A": categories["Compounds"],
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
     * @param  {FileInfo} fileInfo  The file info object.
     * @returns {Promise<void | TreeNode>}  The new TreeNode.
     */
    public static loadFromFileInfo(
        fileInfo: FileInfo
    ): Promise<void | TreeNode> {
        // NOTE: static
        return _parseMoleculeFile(
            fileInfo,
            false // don't add to tree
        ).then((treeNodeList: void | TreeNodeList) => {
            return treeNodeList ? treeNodeList.get(0) : undefined;
        });
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
        //     debugger;
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
     */
    public async addToMainTree() {
        this.reassignAllIds();

        if (SetupTests.isTest) {
            // If it's a test, open it with all nodes expanded.
            expandAndShowAllMolsInTree();
        }

        getMoleculesFromStore().push(this);

        // If you add new molecules to the tree, focus on everything.
        const viewer = await api.visualization.viewer;
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
            const atoms = model.selectedAtoms({});
            xs.push(...atoms.map((atom: IAtom) => atom.x));
            ys.push(...atoms.map((atom: IAtom) => atom.y));
            zs.push(...atoms.map((atom: IAtom) => atom.z));
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
