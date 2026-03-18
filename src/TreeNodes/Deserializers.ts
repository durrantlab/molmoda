import { type IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import type { ITreeNode, TreeNode } from "./TreeNode/TreeNode";
import type { TreeNodeList } from "./TreeNodeList/TreeNodeList";
import { newTreeNode, newTreeNodeList } from "./TreeNodeMakers";
import { type IFileInfo } from "@/FileSystem/Types";

// NOTE: I wanted these to be class variables on TreeNode and TreeNodeList, but
// caused circular dependencies. So these must be called separately. You might
// be able to get around this by putting TreeNode and TreeNodeList in the same
// file, but that seems difficult for code maintenance.

/**
 * Deserialize a TreeNode. Not currently used outside this module, so not
 * exported. But in the future, it might be useful to have this as a public
 * function.
 *
 * @param  {ITreeNode} nodeSerial  The serialized TreeNode.
 * @returns {Promise<TreeNode>}    A promise that resolves the deserialized
 * TreeNode.
 */
async function _treeNodeDeserialize(nodeSerial: ITreeNode): Promise<TreeNode> {
    const newNode = newTreeNode(nodeSerial as TreeNode);
    
    // Freeze model data (atom arrays or file-info objects) to prevent
    // Vue from wrapping tens of thousands of atom objects in reactive
    // proxies. These are treated as immutable read-only data once parsed;
    // any "modification" is done by replacing the model wholesale.
    if (newNode.model) {
        if (Array.isArray(newNode.model)) {
            // IAtom[] : freeze the array and each atom object.
            for (let i = 0; i < (newNode.model as IAtom[]).length; i++) {
                Object.freeze((newNode.model as IAtom[])[i]);
            }
            Object.freeze(newNode.model);
        } else if (
            (newNode.model as IFileInfo).name !== undefined &&
            (newNode.model as IFileInfo).contents !== undefined
        ) {
            // IFileInfo: freeze the file-info object. Its contents string
            // is immutable after parsing.
        Object.freeze(newNode.model);
        }
    }

    // Deserialize nodes.
    const nodes = await (nodeSerial.nodes
        ? treeNodeListDeserialize(nodeSerial.nodes as unknown as ITreeNode[])
        : Promise.resolve(undefined));

    if (nodes !== undefined) {
        newNode.nodes = nodes;
    }

    return newNode;

    // return dynamicImports.mol3d.module
    //     .then(($3Dmol: any) => {
    //         return nodeSerial as ITreeNode;
    //     })
    //     .then((nodeSerial: ITreeNode) => {})
    //     .then((nodes: TreeNodeList | undefined) => {})
    //     .catch((err: any) => {
    //         throw err;
    //     });
    // // return node;
}

/**
 * Deserialize ITreeNode[] to TreeNodeList.
 *
 * @param  {ITreeNode[]} nodes  The serialized TreeNodeList.
 * @returns {Promise<TreeNodeList>}  A promise that resolves the deserialized
 *     TreeNodeList.
 */
export function treeNodeListDeserialize(
    nodes: ITreeNode[]
): Promise<TreeNodeList> {
    const nodePromises = nodes.map((node: ITreeNode) => {
        return _treeNodeDeserialize(node);
    });
    return Promise.all(nodePromises).then((nodes: TreeNode[]) => {
        return newTreeNodeList(nodes);
    });
}

/**
 * Deep clone a TreeNodeList.
 *
 * @param  {TreeNodeList} treeNodeList  The TreeNodeList to clone.
 * @returns {Promise<TreeNodeList>}  A promise that resolves the cloned
 *     TreeNodeList.
 */
export function treeNodeListDeepClone(
    treeNodeList: TreeNodeList
): Promise<TreeNodeList> {
    return treeNodeListDeserialize(treeNodeList.serialize());
}

/**
 * Deep clone a TreeNode.
 *
 * @param  {TreeNode} node          The TreeNode to clone.
 * @param  {boolean}  assignNewIds  Whether to assign new ids to the cloned
 *                                  TreeNode.
 * @returns {Promise<TreeNode>}  A promise that resolves the cloned TreeNode.
 */
export function treeNodeDeepClone(
    node: TreeNode,
    assignNewIds = false
): Promise<TreeNode> {
    return _treeNodeDeserialize(node.serialize()).then((cloned: TreeNode) => {
        if (assignNewIds) {
            cloned.reassignAllIds();
        }
        return cloned;
    });
}
