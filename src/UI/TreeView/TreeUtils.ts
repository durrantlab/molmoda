import { IMolEntry } from "./TreeInterfaces";

interface ILeaf {
    idxPath: number[],
    mol: IMolEntry;
}

export function getTerminalNodes(mols: IMolEntry[], idxPaths: number[] = []): ILeaf[] {
    // Use a recursive function to find the terminal leaves of mols.
    function findLeaves(mls: IMolEntry[], idxPaths: number[]): ILeaf[] {
        let leaves: ILeaf[] = [];
        
        for (let i = 0; i < mls.length; i++) {
            const mol = mls[i];
            // const idxPath = idxPaths.concat([i]);
            if (mol.nodes) {
                leaves = leaves.concat(findLeaves(mol.nodes, idxPaths));
            } else {
                leaves.push({mol, idxPath: idxPaths.concat([i])});
            }
        }
        return leaves;
    }
    return findLeaves(mols, idxPaths);
}
