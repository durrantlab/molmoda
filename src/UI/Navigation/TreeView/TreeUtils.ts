import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "../../../TreeNodes/TreeNode/TreeNode";
import { SelectedType } from "./TreeInterfaces";
import { TreeNodeList } from "../../../TreeNodes/TreeNodeList/TreeNodeList";
import { treeNodeDeepClone } from "../../../TreeNodes/Deserializers";

/**
 * Given a IMolsToConsider variable, gets the molecules to consider.
 *
 * @param  {IMolsToConsider} molsToConsider   The molsToUse variable.
 * @param  {TreeNodeList} [terminalNodes]  The list of molecules to consider.
 *                                            If undefined, gets all molecules
 *                                            from VueX store.
 * @returns {TreeNodeList}  The molecules to consider.
 */
export function getTerminalNodesToConsider(
    molsToConsider: IMolsToConsider,
    terminalNodes?: TreeNodeList
): TreeNodeList {
    if (terminalNodes === undefined) {
        terminalNodes = getMoleculesFromStore();
    }

    // Get the terminal nodes
    terminalNodes = terminalNodes.filters.onlyTerminal;

    let molsToKeep = new TreeNodeList();

    if (molsToConsider.visible) {
        molsToKeep.extend(terminalNodes.filters.keepVisible());
    }

    if (molsToConsider.selected) {
        molsToKeep.extend(terminalNodes.filters.keepSelected());
    }

    if (molsToConsider.hiddenAndUnselected) {
        molsToKeep.extend(
            // mol_filter_ok
            terminalNodes.filter(
                (m: TreeNode) => !m.visible && m.selected === SelectedType.False
            )
        );
    }

    // Make sure there are no duplicates (visible and selected, for example).
    molsToKeep = molsToKeep.filters.onlyUnique;

    return molsToKeep;
}

/**
 * Clones a list of molecules, optionally including their ancestors (direct) and
 * all children. Also assigns new ids, etc. Can't be under TreeNodeList because
 * it calls treeNodeDeepClone (circular dependencies).
 *
 * @param  {TreeNodeList} treeNodeList        The list of molecules to clone.
 * @param  {boolean}  [includeAncestors=true]  If true, includes the ancestors
 *                                             of the molecules in the clone.
 * @returns {Promise<TreeNodeList>}  A promise that resolves the cloned list of
 *     molecules.
 */
export function cloneMolsWithAncestry(
    treeNodeList: TreeNodeList,
    includeAncestors = true
): Promise<TreeNodeList> {
    const allMols = getMoleculesFromStore();
    const promises: Promise<TreeNode>[] = [];

    treeNodeList.forEach((nodeToActOn: TreeNode) => {
        // Get ancestors if includeAncestors specified
        let nodeGenealogy: TreeNodeList;
        if (includeAncestors) {
            // nodeGenealogy = getNodeAncestory(nodeToActOn.id as string, allMols);
            nodeGenealogy = nodeToActOn.getAncestry(allMols);

            // Make shallow copies of all the nodes in the ancestory
            for (let i = 0; i < nodeGenealogy.length; i++) {
                // nodeGenealogy.set(i, new TreeNode({ ...nodeGenealogy.get(i) }));
                const clonedNode = nodeGenealogy.get(i).shallowCopy();
                nodeGenealogy.set(i, clonedNode);
            }

            // Empty the nodes except for the last one (which is the same as
            // nodeToActOn). To avoid including sibling nodes (outside of this
            // ancestory).
            for (let i = 0; i < nodeGenealogy.length - 1; i++) {
                // TODO: This is clearing nodes from main molecule. Has not made
                // copies
                nodeGenealogy.get(i).clearChildren();
            }

            // Place each node in the ancestory under the next node.
            for (let i = 0; i < nodeGenealogy.length - 1; i++) {
                nodeGenealogy.get(i).nodes?.push(nodeGenealogy.get(i + 1));

                // Also, parentId
                nodeGenealogy.get(i + 1).parentId = nodeGenealogy.get(i).id;
            }
        } else {
            // No ancestors requested. Just include this one.
            nodeGenealogy = new TreeNodeList([nodeToActOn.shallowCopy()]);
        }

        // Now you must make a deep copy of everything from the top node down,
        // including children of current nodeToActOn.
        const clonedTree = treeNodeDeepClone(nodeGenealogy.get(0), true)
            .then((topNode: TreeNode): TreeNode => {
                // Get all the nodes as a flat TreeNodeList, including topNode. This
                // is just to make it easier to process each node.
                const allNodesFlattened = new TreeNodeList([topNode]);
                const children = topNode.nodes;
                if (children) {
                    allNodesFlattened.extend(children.flattened);
                }

                // Also unselect, unfocus, and mark as viewerDirty.
                allNodesFlattened.forEach((node: TreeNode) => {
                    node.selected = SelectedType.False;
                    node.viewerDirty = true;
                    node.focused = false;
                });

                return topNode;
            })
            .catch((err: Error) => {
                throw err;
            });

        promises.push(clonedTree);
    });

    return Promise.all(promises).then((treeNodes: TreeNode[]) => {
        return new TreeNodeList(treeNodes);
    });
}

/**
 * Merges a list of molecules into a single molecule. 
 *
 * @param  {TreeNodeList} nodeList               The list of molecules to merge.
 * @param  {string}       [newName="mergedMol"]  The name of the new merged
 *                                               molecule.
 * @returns {Promise<TreeNode>}  A promise that resolves the merged molecule.
 */
export function mergeTreeNodes(
    nodeList: TreeNodeList,
    newName = "mergedMol"
): Promise<TreeNode> {
    // Start by deepcloning all the molecules
    return Promise.all(
        nodeList.map((node: TreeNode) => {
            return treeNodeDeepClone(node, true); // reid
        })
    )
        .then((nodeList: TreeNode[]) => {
            const merged = nodeList[0];
            for (let i = 1; i < nodeList.length; i++) {
                merged.mergeInto(nodeList[i]);
            }
            merged.title = newName;
            return merged;
        })
        .catch((err: Error) => {
            throw err;
        });

    // const treeNode = nodeList.get(0);

    // // Keep going through the nodes of each container and merge them into the
    // // first container.
    // for (let i = 1; i < nodeList.length; i++) {
    //     const treeNode = nodeList.get(i);

    //     // Get the terminal nodes
    //     const terminalNodes = new TreeNodeList([treeNode]).filters
    //         .onlyTerminal;

    //     // Get ancestry of each terminal node
    //     terminalNodes.forEach((terminalNode) => {
    //         const ancestry = terminalNode.getAncestry(
    //             new TreeNodeList([treeNode])
    //         );

    //         // Remove first one, which is the root node
    //         ancestry.shift();

    //         let treeNodePointer = treeNode;
    //         const mergedMolNodesTitles = treeNodePointer.nodes?.map(
    //             (node: TreeNode) => node.title
    //         ) as string[];

    //         while (
    //             mergedMolNodesTitles?.indexOf(ancestry.get(0).title) !== -1
    //         ) {
    //             if (!mergedTreeNodePointer.nodes) {
    //                 // When does this happen?
    //                 break;
    //             }

    //             // Update the pointer
    //             mergedTreeNodePointer =
    //                 mergedTreeNodePointer.nodes.find(
    //                     (node: TreeNode) => node.title === ancestry.get(0).title
    //                 ) as TreeNode;

    //             // Remove the first node from the ancestry
    //             ancestry.shift();
    //         }

    //         // You've reached the place where the node should be added. First,
    //         // update its parentId.
    //         const nodeToAdd = ancestry.get(0);
    //         nodeToAdd.parentId = mergedTreeNodePointer.id;

    //         // And add it
    //         mergedTreeNodePointer.nodes?.push(nodeToAdd);
    //     });
    // }

    // mergedTreeNode.title = newName;

    // return mergedTreeNode;
}
