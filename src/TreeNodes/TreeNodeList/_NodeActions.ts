import type { TreeNode } from "../TreeNode/TreeNode";
import type { TreeNodeList } from "./TreeNodeList";
import { getFlattenedFromCache, setFlattenedInCache } from "../TreeCache";
/**
 * TreeNodeListNodeActions class
 */
export class TreeNodeListNodeActions {
    private parentTreeNodeList: TreeNodeList;

    /**
     * Creates an instance of TreeNodeListNodeActions.
     *
     * @param {TreeNodeList} parentTreeNodeList  The parent TreeNodeList.
     */
    constructor(parentTreeNodeList: TreeNodeList) {
        this.parentTreeNodeList = parentTreeNodeList;
    }

    /**
     * Remove a node of given id, as well as any childless nodes that result.
     * In-place operation.
     *
     * @param  {string | TreeNode | null} node  The id of the node to remove, or
     *                                          the node itself.
     */
    public remove(node: string | TreeNode | null) {
        if (typeof node === "string") {
            node = this.parentTreeNodeList.filters.onlyId(node);
        }
        if (!node) {
            // TreeNode doesn't exist. Take no action.
            return;
        }

        let { id } = node;

        if (!node.parentId) {
            // It's a root node, without a parent id.
            this.parentTreeNodeList.nodes =
                this.parentTreeNodeList.filters.removeId(id as string).nodes;
            return;
        }

        // If you get here, node is not string or null, but must be TreeNode.
        let curNode = this.parentTreeNodeList.filters.onlyId(node.parentId);

        // Could be that in removing this node, parent node has no children. Delete
        // that too, up the tree (because these are not terminal nodes, and if a
        // non-terminal node doens't have any children, there's no reason for it to
        // exist).
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!curNode) {
                // Parent node does not exist. Something's wrong.
                break;
            }

            if (!curNode.nodes) {
                // Parent node has no children, something's wrong.
                break;
            }

            curNode.nodes = curNode.nodes.filters.removeId(id as string);
            if (curNode.nodes.length > 0) {
                // Parent node still has children (siblings of just deleted), so
                // we're done.
                break;
            }

            if (!curNode.parentId) {
                // No parent node, so we're done
                break;
            }

            // Go up to parent.
            id = curNode.id as string;
            curNode = this.parentTreeNodeList.filters.onlyId(curNode.parentId);

            if (!curNode) {
                // No parent node, so we're done. Already checked using parentId,
                // but you need this here for typescript.
                break;
            }
        }
    }

    /**
     * Returns a flat list of all nodes in the tree, depth-first.
     * Uses an iterative stack-based approach to avoid recursion overhead,
     * and leverages a version-stamped cache to avoid recomputation when
     * the tree hasn't changed.
     *
     * @returns {TreeNodeList}  A flat list containing every node in the
     *     hierarchy.
     */
    public get flattened(): TreeNodeList {
        const cached = getFlattenedFromCache(this.parentTreeNodeList);
        if (cached) {
            return cached;
        }

        const rootNodes = this.parentTreeNodeList.nodes;
        // Pre-allocate with a rough capacity estimate to reduce
        // array resizing during large molecule loads.
        const resultNodes: TreeNode[] = [];
        const stack: TreeNode[] = new Array(rootNodes.length);

        // Push in reverse so the first root node is processed first.
        for (let i = rootNodes.length - 1; i >= 0; i--) {
            stack[rootNodes.length - 1 - i] = rootNodes[i];
        }

        let stackLen = rootNodes.length;

        while (stackLen > 0) {
            const node = stack[--stackLen];
                resultNodes.push(node);
                if (node.nodes && node.nodes.length > 0) {
                    const children = node.nodes.nodes;
                // Ensure stack has capacity.
                const needed = stackLen + children.length;
                if (needed > stack.length) {
                    stack.length = needed;
                }
                    for (let i = children.length - 1; i >= 0; i--) {
                    stack[stackLen++] = children[i];
                }
            }
        }

        const result = this.parentTreeNodeList.newTreeNodeList(resultNodes);
        setFlattenedInCache(this.parentTreeNodeList, result);
        return result;
    }

    /**
     * Gets all the nodes, whether terminal or not.
     *
     * @returns {TreeNodeList}  The flat array of all nodes.
     */
    // public get flattened(): TreeNodeList {
    //     // NOTE: This is adapted from ChatGPT's recommended revision of above
    //     // function. I'm fairly certain it works the same, but if you run into
    //     // errors, consider the differences between the two functions.

    //     const allNodes: TreeNode[] = [];
    //     const processedNodes = new Set<TreeNode>();

    //     const stack = [this.parentTreeNodeList._nodes];

    //     while (stack.length > 0) {
    //         const nodes = stack.pop();
    //         // Note nodes should not be null, but typescript doesn't know that.
    //         // Don't want to do check for null every time.

    //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //         // @ts-ignore
    //         for (const node of nodes) {
    //             if (!processedNodes.has(node)) {
    //                 processedNodes.add(node);
    //                 allNodes.push(node);
    //                 if (node.nodes && node.nodes.length > 0) {
    //                     stack.push(node.nodes._nodes);
    //                 }
    //             }
    //         }
    //     }
    //     return this.parentTreeNodeList.newTreeNodeList(allNodes);
    // }

    // /**
    //  * Gets all the nodes, whether terminal or not.
    //  *
    //  * @returns {TreeNodeList}  The flat array of all nodes.
    //  */
    // public get flattened(): TreeNodeList {
    //     // NOTE: This is adapted from ChatGPT's recommended revision of above
    //     // function. I'm fairly certain it works the same, but if you run into
    //     // errors, consider the differences between the two functions.
    //     const treeNodeListStack: TreeNodeList[] = [this.parentTreeNodeList];
    //     const allNodes = this.parentTreeNodeList.newTreeNodeList();

    //     while (treeNodeListStack.length > 0) {
    //         const currentTreeNode = treeNodeListStack.pop();

    //         if (!currentTreeNode) {
    //             continue;
    //         }

    //         currentTreeNode.forEach((treeNode: TreeNode) => {
    //             allNodes.push(treeNode);
    //             if (treeNode.nodes && treeNode.nodes.length > 0) {
    //                 treeNode.nodes.forEach((node) => {
    //                     if (node.nodes) {
    //                         treeNodeListStack.push(node.nodes);
    //                     }
    //                 })
    //             }
    //         });
    //     }

    //     return allNodes;
    // }
}
