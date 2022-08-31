import { IMolContainer, MolType } from "./TreeInterfaces";

/**
 * Get all the nodes that are terminal (have a model, not sub-molecules).
 *
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 * @returns {IMolContainer[]}  The array of terminal nodes.
 */
export function getTerminalNodes(mols: IMolContainer[]): IMolContainer[] {
    /**
     * A recursive function to find the terminal leaves of mols.
     *
     * @param  {IMolContainer[]} mls  The array of IMolContainer to search.
     * @returns {IMolContainer[]}  The array of terminal nodes (leaves).
     */
    function findLeaves(mls: IMolContainer[]): IMolContainer[] {
        let leaves: IMolContainer[] = [];

        for (const mol of mls) {
            if (mol.nodes) {
                leaves = leaves.concat(findLeaves(mol.nodes));
            } else {
                leaves.push(mol);
            }
        }
        return leaves;
    }
    return findLeaves(mols);
}

/**
 * Gets all the nodes, whether terminal or not.
 *
 * @param  {IMolContainer[]} mols  The hierarchical array of IMolContainer to
 *                                 search.
 * @returns {IMolContainer[]}  The flat array of all nodes.
 */
export function getAllNodesFlattened(mols: IMolContainer[]): IMolContainer[] {
    /**
     * A recursive function to find the terminal leaves of mols.
     *
     * @param  {IMolContainer[]} mls  The hierarchical array of IMolContainer to
     *                                search.
     * @returns {IMolContainer[]}  The flat array of nodes.
     */
    function findNodes(mls: IMolContainer[]): IMolContainer[] {
        let allNodes: IMolContainer[] = [];

        for (const mol of mls) {
            if (mol.nodes) {
                allNodes = allNodes.concat(findNodes(mol.nodes));
            }
            allNodes.push(mol);
        }
        return allNodes;
    }
    return findNodes(mols);
}

/**
 * Find a node with a given id.
 * 
 * @param  {string}          id    The id of the node to find.
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 * @returns {IMolContainer | null}  The node with the given id, or null if not
 *     found.
 */
export function getNodeOfId(
    id: string,
    mols: IMolContainer[]
): IMolContainer | null {
    /**
     * A recursive function to find the node of id.
     *
     * @param  {IMolContainer[]} mls  The array of IMolContainer to search.
     * @param  {string}          i    The id of the node to find.
     * @returns {IMolContainer | null}  The node with the given id, or null if
     *                                  not.
     */
    function findNode(mls: IMolContainer[], i: string): IMolContainer | null {
        for (const mol of mls) {
            if (mol.id === i) {
                return mol;
            }
            if (mol.nodes) {
                const node = findNode(mol.nodes, i);
                if (node !== null) {
                    return node;
                }
            }
        }
        return null;
    }
    return findNode(mols, id);
}

/**
 * Find all nodes with a given type.
 *
 * @param  {IMolContainer[]} mols                 The array of IMolContainer to
 *                                                search.
 * @param  {MolType}         type                 The type of nodes to find.
 * @param  {boolean}         [onlyVisible=false]  Whether to only consider
 *                                                visible nodes.
 * @returns {IMolContainer[]}  The array of nodes with the given type.
 */
export function getNodesOfType(
    mols: IMolContainer[],
    type: MolType,
    onlyVisible = false
): IMolContainer[] {
    let nodesToConsider = getAllNodesFlattened(mols);
    nodesToConsider = nodesToConsider.filter((node) => node.type === type);

    if (onlyVisible) {
        nodesToConsider = nodesToConsider.filter((node) => node.visible);
    }

    // Note that children of compounds also marked compounds, so no need to
    // explicitly search for/include children.

    return nodesToConsider;
}

/**
 * Remove a node of given id.
 * 
 * @param  {string}          id    The id of the node to remove.
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 */
export function removeNode(id: string, mols: IMolContainer[]) {
    const node = getNodeOfId(id, mols);
    if (!node || !node.parentId) {
        return;
    }

    const parentNode = getNodeOfId(node.parentId, mols);
    if (!parentNode || !parentNode.nodes) {
        return;
    }

    parentNode.nodes = parentNode.nodes.filter((n) => n.id !== id);
}

/**
 * Add a node after another node.
 *
 * @param  {IMolContainer} nodeToAdd     The node to add.
 * @param  {IMolContainer} existingNode  The node to add after.
 * @param  {IMolContainer[]} mols        The array of IMolContainer to search.
 */
export function addNodeAfter(
    nodeToAdd: IMolContainer,
    existingNode: IMolContainer,
    mols: IMolContainer[]
) {
    if (!existingNode.parentId) {
        return;
    }

    // Get the parent node of existing node
    const parentNode = getNodeOfId(existingNode.parentId, mols);

    if (!parentNode || !parentNode.nodes) {
        return;
    }

    // Get index of existing node in the list.
    const existingNodeIndex = parentNode.nodes.findIndex(
        (n) => n.id === existingNode.id
    );

    // Insert the new node after the existing node.
    parentNode.nodes.splice(existingNodeIndex + 1, 0, nodeToAdd);

    // Update nodeToAdd parentId
    nodeToAdd.parentId = parentNode.id;
}

/**
 * Get the root (parent-most) nodes of a given type.
 *
 * @param  {IMolContainer[]} mols  The array of IMolContainer to search.
 * @param  {MolType}         type  The type of nodes to find.
 * @returns {IMolContainer[]}  The array of root nodes of the given type.
 */
export function getRootNodesOfType(mols: IMolContainer[], type: MolType): IMolContainer[] {
    // Think of this as the opposite of getTerminalNodes. Instead of getting the
    // nodes with no more children, you're getting the nodes whose parent type
    // is different.
    const allNodes = getAllNodesFlattened(mols);
    return allNodes.filter((node) => {
        if (node.type !== type) {
            return false;
        }
        if (node.parentId) {
            const parentNode = getNodeOfId(node.parentId, mols);
            if (parentNode) {
                return parentNode.type !== type;
            }
        }
        return true;
    });
}