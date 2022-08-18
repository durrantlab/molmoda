import { IMolContainer, MolType } from "./TreeInterfaces";

export function getTerminalNodes(mols: IMolContainer[]): IMolContainer[] {
    // Use a recursive function to find the terminal leaves of mols.
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

export function getAllNodesFlattened(mols: IMolContainer[]): IMolContainer[] {
    // Use a recursive function to find the terminal leaves of mols.
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

export function getNodeOfId(
    id: string,
    mols: IMolContainer[]
): IMolContainer | null {
    // Use a recursive function to find the node of id.
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

export function getNodesOfType(
    mols: IMolContainer[],
    type: MolType,
    onlyConsiderVisible = false
): IMolContainer[] {
    let nodesToConsider = getAllNodesFlattened(mols);
    nodesToConsider = nodesToConsider.filter((node) => node.type === type);

    if (onlyConsiderVisible) {
        nodesToConsider = nodesToConsider.filter((node) => node.visible);
    }

    // Note that children of compounds also marked compounds, so no need to
    // explicitly search for/include children.

    return nodesToConsider;
}

export function removeNode(id: string, mols: IMolContainer[]): void {
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

export function addNodeAfter(
    nodeToAdd: IMolContainer,
    existingNode: IMolContainer,
    mols: IMolContainer[]
): void {
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