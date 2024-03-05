import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getTerminalNodesToConsider } from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolsToConsider, ICompiledNodes } from "./Types";
import { separateCompoundNonCompoundTerminalNodes } from "./Utils";

/**
 * Runs the job when the user wants to save in a non-molmoda format, by
 * molecule.
 *
 * @param {IMolsToConsider} molsToConsider         The molecules to save.
 * @param {boolean}         keepCompoundsSeparate  Whether to keep compounds
 *                                                 separate. If false, they sre
 *                                                 merged with the main
 *                                                 molecule.
 * @returns {ICompiledNodes}  A promise that resolves when the job is done, with
 *     the files.
 */
export function compileByMolecule(
    molsToConsider: IMolsToConsider,
    keepCompoundsSeparate: boolean
): ICompiledNodes {
    // Not using molmoda format. Create ZIP file with protein and small
    // molecules.
    let compoundNodes = new TreeNodeList();
    const nonCompoundNodesByMolecule: TreeNodeList[] = [];

    getMoleculesFromStore().forEach((treeNode) => {
        const allNodes = new TreeNodeList([treeNode]);
        if (treeNode.nodes) {
            allNodes.extend(treeNode.nodes);
        }

        if (keepCompoundsSeparate) {
            const separatedNodes =
                separateCompoundNonCompoundTerminalNodes(allNodes);

            compoundNodes.extend(
                getTerminalNodesToConsider(
                    molsToConsider,
                    separatedNodes.compoundNodes
                )
            );

            let terminalNodes = getTerminalNodesToConsider(
                molsToConsider,
                separatedNodes.nonCompoundNodes
            );

            // Remove undefineds, regions
            terminalNodes = terminalNodes.filters.removeUndefined();
            terminalNodes = terminalNodes.filters.keepRegions(false);

            nonCompoundNodesByMolecule.push(terminalNodes);
        } else {
            // Keep compounds together with non-compounds.
            let termNodes = getTerminalNodesToConsider(
                molsToConsider,
                allNodes
            );
            termNodes = termNodes.filters.onlyUnique;

            // Removed undefineds, regions
            termNodes = termNodes.filters.removeUndefined();
            termNodes = termNodes.filters.keepRegions(false);

            nonCompoundNodesByMolecule.push(termNodes);
        }
    });

    compoundNodes = compoundNodes.filters.removeUndefined();
    compoundNodes = compoundNodes.filters.keepRegions(false);

    return {
        // mol_filter_ok
        nodeGroups: nonCompoundNodesByMolecule.filter(
            (n) => n !== undefined && n.length > 0
        ),
        compoundsNodes: compoundNodes,
    };

    // return Promise.all(promises)
    //     .then((txts: IFileInfo[][]) => {
    //         // Merge the two arrays
    //         const allTxts = [];
    //         for (const txtArray of txts) {
    //             allTxts.push(...txtArray);
    //         }
    //         return allTxts;
    //     });
}
