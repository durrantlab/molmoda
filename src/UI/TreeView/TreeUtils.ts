import { IMolEntry } from "./TreeInterfaces";

export function getTerminalNodes(mols: IMolEntry[]): IMolEntry[] {
    // Use a recursive function to find the terminal leaves of mols.
    function findLeaves(mls: IMolEntry[]): IMolEntry[] {
        let leaves: IMolEntry[] = [];
        
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

export function getAllNodes(mols: IMolEntry[]): IMolEntry[] {
    // Use a recursive function to find the terminal leaves of mols.
    function findNodes(mls: IMolEntry[]): IMolEntry[] {
        let allNodes: IMolEntry[] = [];
        
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

export function getNodeOfId(id: string, mols: IMolEntry[]): IMolEntry | null {
    // Use a recursive function to find the node of id.
    function findNode(mls: IMolEntry[], id: string): IMolEntry | null {
        for (const mol of mls) {
            if (mol.id === id) {
                return mol;
            }
            if (mol.nodes) {
                const node = findNode(mol.nodes, id);
                if (node !== null) {
                    return node;
                }
            }
        }
        return null;
    }
    return findNode(mols, id);
}