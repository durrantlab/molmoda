import { dynamicImports } from "@/Core/DynamicImports";
import type { ITreeNode, TreeNode } from "./TreeNode/TreeNode";
import type { TreeNodeList } from "./TreeNodeList/TreeNodeList";
import { newTreeNode, newTreeNodeList } from "./TreeNodeMakers";

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
    const $3Dmol = await dynamicImports.mol3d.module;

    // Deserialize and model if it is not a 3Dmol model or an IFileInfo.
    if (nodeSerial.model && !(nodeSerial.model as any).name && !(nodeSerial.model as any).content) {
        const model = new $3Dmol.GLModel();
        model.addAtoms(nodeSerial.model);
        newNode.model = model;

        // The model should not be reactive or alterable after loaded.
        // Note that this dramatically improves performance in vue, but
        // any changes to the model will require recreating it entirely.
        Object.freeze(newNode.model);
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
