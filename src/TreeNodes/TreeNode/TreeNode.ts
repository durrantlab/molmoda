import { randomID } from "@/Core/Utils/MiscUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getMoleculesFromStore, pushToStoreList, setStoreVar, } from "@/Store/StoreExternalAccess";
import type { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { TreeNodeType, SelectedType, ITreeNodeData, IAtom, IRegion, IBox, RegionType, } from "../../UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "../TreeNodeList/TreeNodeList";
import { newTreeNodeList, setupMakerFuncs } from "../TreeNodeMakers";
import { TreeNodeAncestry } from "./_Ancestry";
import { TreeNodeDescriptions } from "./_Descriptions";
import { store } from "@/Store";
import { visualizationApi } from "@/Api/Visualization";
import { expandAndShowAllMolsInTree } from "@/Testing/SetupTests";
import {
    EasyParserWorkerClient,
    WORKER_ATOM_THRESHOLD,
} from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser/EasyParserWorkerClient";
import { IFileInfo } from "@/FileSystem/Types";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
// import { ILoadMolParams } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/Types";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
import { updateStylesInViewer } from "@/Core/Styling/StyleManager";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { isTest } from "@/Core/GlobalVars";
import { _convertTreeNodeList } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeList";
import { toRaw } from "vue";

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
     * @returns {SelectedType}  The selected state.
     */
    get selected(): SelectedType {
        return this._selected;
    }

    /**
     * Set the selected state.
     * @param {SelectedType} val  The selected state.
     */
    set selected(val: SelectedType) {
        // Set to dirty to trigger rerender of molecule (with yellow outline to
        // indicate selected).
        if (this._selected !== val) {
            this.viewerDirty = true;

            this._selected = val;
        }
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
     * @returns {boolean}  Whether this node is visible.
     */
    public get visible(): boolean {
        return this._visible;
    }

    /**
     * Set whether this node is visible.
     * @param {boolean} val  Whether this node is visible.
     */
    public set visible(val: boolean) {
        // Make this one visible as well as all its children.
        if (this._visible !== val) {
            this.nodes?.flattened.forEach((nd) => {
                nd._visible = val;
            });
            this._visible = val;
        }
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
     * @returns {TreeNodeDescriptions}  The descriptions subclass.
     */
    public get descriptions(): TreeNodeDescriptions {
        return this._descriptions;
    }

    /**
     * Get the parent node of the current node.
     * @returns {TreeNode | undefined}  The parent node, or undefined if there
     *     is no parent.
     */
    public get parentTreeNode(): TreeNode | undefined {
        const ancestors = this.getAncestry(store.state.molecules);
        return ancestors.get(ancestors.length - 2);
    }

    /**
     * Serialize the TreeNode (removes objects).
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
                const element = this[key as keyof this];
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
     * @returns {TreeNode}  The shallow copy.
     */
    public shallowCopy(): TreeNode {
        const prop: { [key: string]: any } = {};
        for (const key in this) {
            prop[key] = this[key as keyof this];
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
     * @param  {TreeNodeList}  [mols]  The list of molecules to
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
     * @param  {string}    targetExt   The extension of the format to
     *            convert to.
     * @param {boolean} [considerDescendants] If true and this is a container node,
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
     * Creates a new TreeNode. Putting this in a function here helps with circular
     * dependencies.
     * @param  {ITreeNode} params  The parameters to create the TreeNode with.
     * @returns {TreeNode}  The new TreeNode.
     */
    public newTreeNode(params: ITreeNode): TreeNode {
        // To help with circular dependencies.
        return new TreeNode(params);
    }

    /**
     * Get the depth of the tree (number of descendents).
     * @returns {number}  The depth of the tree.
     */
    public get depth(): number {
        let maxDepthFound = 1;

        /**
         * Recursively traverse the tree to find the maximum depth.
         * @param {TreeNode} node The current node.
         * @param {number} depthSoFar The depth so far.
         * @returns {number} The maximum depth found.
         */
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
     * Prepares this node for insertion into the main tree without actually
     * pushing it to the store. This avoids triggering reactivity per-node
     * during batch loads. The caller is responsible for the final store push.
     *
     * @param {string | null} tag       The tag to add to this node.
     * @param {boolean} [reassignIds]    Whether to reassign IDs.
     * @param {boolean} [terminalNodeTitleRevisable] Whether the terminal node
     *                                               title should be revisable.
     * @param {boolean} [resetVisibilityAndSelection] Whether to reset
     *                                                visibility and selection.
     */
    public prepareForMainTree(
        tag: string | null,
        reassignIds = true,
        terminalNodeTitleRevisable = true,
        resetVisibilityAndSelection = true
    ): void {
        if (reassignIds) {
            this.reassignAllIds();
        }

        if (isTest) {
            expandAndShowAllMolsInTree();
        }

        const allNodesInSubtree = new TreeNodeList([this]).flattened;

        if (tag) {
            allNodesInSubtree.forEach((node) => {
                if (node.tags === undefined) {
                    node.tags = [];
                }
                if (!node.tags.includes(tag)) {
                    node.tags.push(tag);
                }
            });
        }

        if (resetVisibilityAndSelection) {
            allNodesInSubtree.forEach((node) => {
                if (node.nodes) {
                    node.visible = true;
                }
            });
            this.visible = true;

            const terminalNodes = this.nodes
                ? this.nodes.terminals
                : new TreeNodeList([]);
            if (this.model) {
                terminalNodes.push(this);
            }

            // Use a synchronous default; the caller can adjust visibility
            // thresholds after the batch insert if needed.
            const defaultInitialVisible = 20;
            terminalNodes.forEach((node, i) => {
                node.visible = i < defaultInitialVisible;
            });

            allNodesInSubtree.forEach((node) => {
                node.selected = SelectedType.False;
            });
        }

        if (
            terminalNodeTitleRevisable &&
            this.nodes &&
            this.nodes.terminals.length === 1
        ) {
            this.nodes.terminals.get(0).title = `${this.title}:${this.nodes.terminals.get(0).title
                }`;
        }
    }

    /**
     * A helper function. Adds this node to the molecules in the vuex store.
     * @param {string | null} tag       The tag to add to this
     *             node.
     * @param {boolean} [reassignIds]    Whether to reassign
     *             IDs to the new nodes
     *             to avoid collisions.
     *             Set to false when
     *             loading a saved
     *             session.
     * @param {boolean} [terminalNodeTitleRevisable] Whether the title of
     *             the terminal node
     *             should be revisable.
     *             Revised if there is
     *             only one terminal
     *             node. If you're adding
     *             nodes incrementally,
     *             good to set to false.
     * @param {boolean} [resetVisibilityAndSelection] Whether to make the molecule
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
            this.nodes.terminals.get(0).title = `${this.title}:${this.nodes.terminals.get(0).title
                }`;
        }

        // Clear focus on all existing molecules before adding the new one,
        // so the viewer knows to zoom to the newly added molecule.
        const existingMols = getMoleculesFromStore();
        existingMols.flattened.forEach((node) => {
            node.focused = false;
        });
        this.focused = true;

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

    // Commenting out below because always async now.
    // /**
    //  * Gets the box surrounding the model.
    //  * @param  {number} [padding]  The padding to add to the box.
    //  * @returns {IBox}  The box.
    //  */
    // public getBoxRegion(padding = 3.4): IBox {
    //     // Note 3.4 is approximate vdw diameter of carbon.

    //     // Get all the nodes and subnodes with models (including this one).
    //     const nodesWithModels = newTreeNodeList([this]).filters.keepModels(
    //         true,
    //         true
    //     ).nodes;
    //     const xs: number[] = [];
    //     const ys: number[] = [];
    //     const zs: number[] = [];
    //     nodesWithModels.forEach((node: TreeNode) => {
    //         const model = node.model as GLModel;
    //         // Get atoms
    //         const { atoms } = makeEasyParser(model);
    //         xs.push(...atoms.map((atom: IAtom) => atom.x as number));
    //         ys.push(...atoms.map((atom: IAtom) => atom.y as number));
    //         zs.push(...atoms.map((atom: IAtom) => atom.z as number));
    //     });

    //     // Get min and max x, y, and z
    //     const minX = Math.min(...xs);
    //     const maxX = Math.max(...xs);
    //     const minY = Math.min(...ys);
    //     const maxY = Math.max(...ys);
    //     const minZ = Math.min(...zs);
    //     const maxZ = Math.max(...zs);

    //     // Get box center
    //     const centerX = (minX + maxX) / 2;
    //     const centerY = (minY + maxY) / 2;
    //     const centerZ = (minZ + maxZ) / 2;

    //     // Try to get color of this node if you can find it.
    //     let color: string | undefined = undefined;
    //     if (this.styles && this.styles.length > 0) {
    //         for (const style of this.styles) {
    //             const colors = [
    //                 style.surface?.color,
    //                 style.sphere?.color,
    //                 style.cartoon?.color,
    //                 style.stick?.color,
    //                 style.line?.color,
    //             ];
    //             // Get first color in colors that is not undefined
    //             color = colors.find((c: string | undefined) => c !== undefined);
    //             if (color !== undefined) {
    //                 break;
    //             }
    //         }
    //     }

    //     if (color === undefined) {
    //         // If none of the styles can a color attribute set, just use red.
    //         color = "red";
    //     }

    //     return {
    //         type: RegionType.Box,
    //         center: [centerX, centerY, centerZ],
    //         opacity: 0.5,
    //         color: color,
    //         movable: true,
    //         dimensions: [
    //             maxX - minX + padding,
    //             maxY - minY + padding,
    //             maxZ - minZ + padding,
    //         ],
    //     } as IBox;
    // }

    /**
     * Gets the box surrounding the model. Uses the EasyParser webworker for
     * large molecules to avoid blocking the main thread during bounding box
     * computation.
     *
     * @param  {number} [padding]  The padding to add to the box.
     * @returns {Promise<IBox>}  A promise resolving to the box region.
     */
    public async getBoxRegionAsync(padding = 3.4): Promise<IBox> {
        // Note 3.4 is approximate vdw diameter of carbon.
        const nodesWithModels = newTreeNodeList([this]).filters.keepModels(
            true,
            true
        ).nodes;

        // Classify nodes by atom count to route small models synchronously
        // and large models through the worker.
        const smallModels: TreeNode[] = [];
        const largeModels: TreeNode[] = [];

        for (let i = 0; i < nodesWithModels.length; i++) {
            const node = nodesWithModels[i];
            const atomCount = this._estimateAtomCount(node.model);
            if (atomCount >= WORKER_ATOM_THRESHOLD) {
                largeModels.push(node);
            } else {
                smallModels.push(node);
            }
        }

        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;

        // Process small models synchronously.
        for (const node of smallModels) {
            const model = node.model as GLModel;
            const { atoms } = makeEasyParser(model);
            for (const atom of atoms) {
                if (atom.x !== undefined) {
                    minX = Math.min(minX, atom.x as number);
                    maxX = Math.max(maxX, atom.x as number);
                }
                if (atom.y !== undefined) {
                    minY = Math.min(minY, atom.y as number);
                    maxY = Math.max(maxY, atom.y as number);
                }
                if (atom.z !== undefined) {
                    minZ = Math.min(minZ, atom.z as number);
                    maxZ = Math.max(maxZ, atom.z as number);
                }
            }
        }

        // Process large models via the worker in parallel.
        if (largeModels.length > 0) {
            const client = EasyParserWorkerClient.getInstance();
            const handles: string[] = [];

            try {
                const createPromises = largeModels.map((node) => {
                    return this._createWorkerParser(client, node.model);
                });
                const createdHandles = await Promise.all(createPromises);
                handles.push(...createdHandles);

                const boundsPromises = handles.map((h) =>
                    client.getBounds(h)
                );
                const boundsResults = await Promise.all(boundsPromises);

                for (const bounds of boundsResults) {
                    if (bounds) {
                        minX = Math.min(minX, bounds.minX);
                        minY = Math.min(minY, bounds.minY);
                        minZ = Math.min(minZ, bounds.minZ);
                        maxX = Math.max(maxX, bounds.maxX);
                        maxY = Math.max(maxY, bounds.maxY);
                        maxZ = Math.max(maxZ, bounds.maxZ);
                    }
                }
            } finally {
                await Promise.all(
                    handles.map((h) => client.destroyParser(h))
                );
            }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Try to get color of this node from its styles.
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
                color = colors.find((c: string | undefined) => c !== undefined);
                if (color !== undefined) {
                    break;
                }
            }
        }

        if (color === undefined) {
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

    /**
     * Estimates the atom count for a model without fully parsing it. Used to
     * decide whether to route computation to the webworker or handle it
     * synchronously on the main thread.
     *
     * @param {IAtom[] | GLModel | IFileInfo | undefined} model  The model.
     * @returns {number}  Estimated atom count.
     */
    private _estimateAtomCount(
        model: IAtom[] | GLModel | IFileInfo | undefined
    ): number {
        if (model === undefined) {
            return 0;
        }
        if (Array.isArray(model)) {
            return (model as IAtom[]).length;
        }
        if ((model as GLModel).selectedAtoms !== undefined) {
            return (model as GLModel).selectedAtoms({}).length;
        }
        // IFileInfo: use the sync parser constructor which only splits lines
        // (cheap) to get a count.
        const parser = makeEasyParser(model as IFileInfo);
        return parser.length;
    }

    /**
     * Creates a worker-backed parser from a model, handling the three possible
     * storage formats (IAtom[], GLModel, IFileInfo). Strips Vue reactivity
     * proxies and extracts only serializable data to avoid DataCloneError
     * during postMessage to the worker.
     *
     * @param {EasyParserWorkerClient} client  The worker client.
     * @param {IAtom[] | GLModel | IFileInfo | undefined} model  The model data.
     * @returns {Promise<string>}  The worker parser handle.
     */
    private async _createWorkerParser(
        client: EasyParserWorkerClient,
        model: IAtom[] | GLModel | IFileInfo | undefined
    ): Promise<string> {
        if (model === undefined) {
            // Create an empty parser in the worker.
            return client.createParserFromAtoms([]);
        }

        const raw = toRaw(model);

        if (Array.isArray(raw)) {
            return client.createParserFromAtoms(raw as IAtom[]);
        }
        if ((raw as GLModel).selectedAtoms !== undefined) {
            const atoms = (raw as GLModel).selectedAtoms({}) as IAtom[];
            return client.createParserFromAtoms(atoms);
        }
        // IFileInfo: create a plain object with only serializable properties.
        const fileInfo = raw as IFileInfo;
        return client.createParser({
            name: fileInfo.name,
            contents: fileInfo.contents,
        } as IFileInfo);
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
