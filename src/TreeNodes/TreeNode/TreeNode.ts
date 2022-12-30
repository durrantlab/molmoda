import { randomID } from "@/Core/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { _convertTreeNodeList } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeList";
import { _parseMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import type { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import type {
    MolType,
    SelectedType,
    ITreeNodeData,
    IAtom,
    IStyle,
    IShape,
} from "../../UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "../TreeNodeList/TreeNodeList";
import { setupMakerFuncs } from "../TreeNodeMakers";
import { TreeNodeAncestry } from "./_Ancestry";
import { TreeNodeDescriptions } from "./_Descriptions";

// Deserialized (object-based) version of TreeNode
export interface ITreeNode {
    // Properties common to both non-terminal and terminal nodes.
    title: string; // appears in tree
    type?: MolType;
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
    shape?: IShape;

    // These are specifically for non-terminal nodes
    nodes?: TreeNodeList; // Next level down in menu. So if molecule,
}

/**
 * TreeNode class.
 */
export class TreeNode {
    // Properties common to both non-terminal and terminal nodes.
    title: string; // appears in tree
    type?: MolType;
    id?: string; // random id for nodes
    parentId?: string; // parent id for tree
    src?: string; // typically, the file name
    treeExpanded: boolean;
    visible: boolean;
    selected: SelectedType; // Not bool (string enum). "false" vs. false.
    focused: boolean;
    viewerDirty: boolean; // triggers 3dmoljs viewer
    data?: { [key: string]: ITreeNodeData }; // key is title of chart, etc.

    // These are specifically for non-terminal nodes
    nodes?: TreeNodeList; // Next level down in menu. So if molecule,

    // These are specifically for terminal nodes
    model?: IAtom[] | GLModel; // IAtom in worker, GLMoldel in main thread
    styles?: IStyle[]; // styles and selections for this node
    shape?: IShape;

    private _descriptions: TreeNodeDescriptions;
    private _ancestry: TreeNodeAncestry;

    /**
     * The constructor.
     *
     * @param  {ITreeNode} params  The parameters.
     */
    constructor(params: ITreeNode) {
        this.title = params.title;
        this.type = params.type;
        this.id = params.id;
        this.parentId = params.parentId;
        this.src = params.src;
        this.treeExpanded = params.treeExpanded;
        this.visible = params.visible;
        this.selected = params.selected;
        this.focused = params.focused;
        this.viewerDirty = params.viewerDirty;
        this.data = params.data;
        this.nodes = params.nodes;
        this.model = params.model;
        this.styles = params.styles;
        this.shape = params.shape;

        this._descriptions = new TreeNodeDescriptions(this);
        this._ancestry = new TreeNodeAncestry(this);
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
     * @param  {TreeNodeList}  mols  The list of molecules to search.
     * @returns {TreeNodeList}  The list of nodes in the ancestory.
     */
    public getAncestry(mols: TreeNodeList): TreeNodeList {
        return this._ancestry.getAncestory(mols);
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
     * Assigns new ids to all nodes in the tree. This is useful when cloning
     * a tree, for example. This is done in place.
     */
    reassignAllIds() {
        // Get all the nodes as a flat TreeNodeList, including cloned. This
        // is just to make it easier to process each node.
        const allNodesFlattened = new TreeNodeList([this]);
        const children = this.nodes;
        if (children) {
            allNodesFlattened.extend(children.flattened);
        }

        // For every existing id in the flat list, make up a new id.
        const oldIdToNewId = new Map<string, string>();
        allNodesFlattened.forEach((node: TreeNode) => {
            oldIdToNewId.set(node.id as string, randomID());
        });

        // Go through and assign the new ids, both as ids and parentIDs.
        allNodesFlattened.forEach((node: TreeNode) => {
            node.id = oldIdToNewId.get(node.id as string);
            if (node.parentId) {
                node.parentId = oldIdToNewId.get(node.parentId);
            }
        });
    }

    /**
     * A helper function. Adds this node to the molecules in the vuex store.
     */
    public addToMainTree() {
        getMoleculesFromStore().push(this);
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
