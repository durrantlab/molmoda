import { IMolContainer } from "./TreeInterfaces";

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

export function getNodeOfId(id: string, mols: IMolContainer[]): IMolContainer | null {
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
    type: string,
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
