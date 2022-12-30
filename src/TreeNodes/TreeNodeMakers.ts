// This is all just to get around circular dependencies. If using `new TreeNode`
// and `new TreeNodeList` gives such an error, use these functions instead.

import type { TreeNode } from "./TreeNode/TreeNode";
import type { TreeNodeList } from "./TreeNodeList/TreeNodeList";

export let newTreeNode: (params: TreeNode) => TreeNode;
export let newTreeNodeList: (params: TreeNode[]) => TreeNodeList;

/**
 * Setup the functions that make new TreeNodes and TreeNodeLists. This is
 * necessary to avoid circular dependencies.
 *
 * @param  {Function} makeNode      The function that makes new TreeNodes.
 * @param  {Function} makeNodeList  The function that makes new TreeNodeLists.
 */
export function setupMakerFuncs(
    makeNode: (params: TreeNode) => TreeNode,
    makeNodeList: (params: TreeNode[]) => TreeNodeList
) {
    newTreeNode = makeNode;
    newTreeNodeList = makeNodeList;
}
