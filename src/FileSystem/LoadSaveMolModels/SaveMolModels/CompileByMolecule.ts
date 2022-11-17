import { slugify } from "@/Core/Utils";
import { IFileInfo } from "@/FileSystem/Types";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import { getTerminalNodesToConsider } from "@/UI/Forms/MoleculeInputParams/WhichMols";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ICompiledNodes, IMolsToConsider } from "./SaveMolModels";
import {
    getConvertedTxts,
    getPrimaryExt,
    removeRepeatMolContainers,
    separateCompoundNonCompoundTerminalNodes,
} from "./Utils";

/**
 * Runs the job when the user wants to save in a non-biotite format, by
 * molecule.
 *
 * @param {IMolsToConsider} molsToConsider     The molecules to save.
 * @returns {ICompiledNodes}  A promise that resolves when the job is
 *     done, with the files.
 */
export function compileByMolecule(
    molsToConsider: IMolsToConsider,
    keepCompoundsSeparate: boolean
): ICompiledNodes {
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.
    const compoundNodes: IMolContainer[] = [];
    const nonCompoundNodesByMolecule: IMolContainer[][] = [];

    for (const molContainer of getStoreVar("molecules")) {
        const allNodes = [molContainer];
        if (molContainer.nodes) {
            allNodes.push(...molContainer.nodes);
        }

        if (keepCompoundsSeparate) {
            const separatedNodes =
                separateCompoundNonCompoundTerminalNodes(allNodes);

            compoundNodes.push(
                ...getTerminalNodesToConsider(
                    molsToConsider,
                    separatedNodes.compoundNodes
                )
            );

            nonCompoundNodesByMolecule.push(
                getTerminalNodesToConsider(
                    molsToConsider,
                    separatedNodes.nonCompoundNodes
                )
            );
        } else {
            // Keep compounds together with non-compounds.
            let termNodes = getTerminalNodesToConsider(
                molsToConsider,
                allNodes
            );
            termNodes = removeRepeatMolContainers(termNodes);
            nonCompoundNodesByMolecule.push(termNodes);
        }
    }

    return {
        nodeGroups: nonCompoundNodesByMolecule,
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
