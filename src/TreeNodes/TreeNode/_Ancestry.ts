import type { TreeNodeList } from "../TreeNodeList/TreeNodeList";
import { newTreeNodeList } from "../TreeNodeMakers";
import type { TreeNode } from "./TreeNode";

/**
 * TreeNodeAncestry class.
 */
export class TreeNodeAncestry {
    private parentTreeNode: TreeNode;

    /**
     * Constructor.
     * 
     * @param  {TreeNode} parentTreeNode The parent TreeNode.
     */
    constructor(parentTreeNode: TreeNode) {
        this.parentTreeNode = parentTreeNode;
    }

    /**
     * Get a nodes ancestory. First element is most distant ancestor (greatest
     * grandparent), and last is this node itself.
     *
     * @param  {TreeNodeList}  mols  The list of molecules to search.
     * @returns {TreeNodeList}  The list of nodes in the ancestory.
     */
    public getAncestry(mols: TreeNodeList): TreeNodeList {
        // If you get here, node is of type TreeNode.

        let curNode = this.parentTreeNode;
        const ancestors = newTreeNodeList([this.parentTreeNode]);
        while (curNode.parentId) {
            const parentNode = mols.filters.onlyId(curNode.parentId);

            if (parentNode === null) {
                break;
            }

            // Add at first position
            ancestors.unshift(parentNode);
            curNode = parentNode;
        }

        return ancestors;
    }
}
