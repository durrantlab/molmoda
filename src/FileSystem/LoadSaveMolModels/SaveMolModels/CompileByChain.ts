import { getTerminalNodesToConsider } from "@/UI/Forms/MoleculeInputParams/WhichMols";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import {
    getPrimaryExt,
    getConvertedTxts,
    separateCompoundNonCompoundTerminalNodes,
} from "./Utils";
import { IFileInfo } from "@/FileSystem/Types";
import { ICompiledNodes, IMolsToConsider } from "./SaveMolModels";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * Runs the job when the user wants to save in a non-biotite format, by chain.
 *
 * @param {IMolsToConsider} molsToConsider  The molecules to save.
 * @returns {ICompiledNodes}  A promise that resolves when the job is
 *     done, with the files.
 */
export function compileByChain(
    molsToConsider: IMolsToConsider,
    keepCompoundsSeparate: boolean
): ICompiledNodes {
    alert("Compiling by chain depreciated!");
    throw new Error("Compiling by chain depreciated!");
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.

    let compoundNodes: IMolContainer[] = [];
    let nonCompoundNodes: IMolContainer[][] = [];

    const allMolContainers = getStoreVar("molecules");

    if (keepCompoundsSeparate) {
        const terminalNodes =
            separateCompoundNonCompoundTerminalNodes(allMolContainers);

        compoundNodes = getTerminalNodesToConsider(
            molsToConsider,
            terminalNodes.compoundNodes
        );

        nonCompoundNodes = getTerminalNodesToConsider(
            molsToConsider,
            terminalNodes.nonCompoundNodes
        ).map((node) => [node]);
    } else {
        // Not separating compounds and noncompounds.
        nonCompoundNodes = getTerminalNodesToConsider(
            molsToConsider,
            allMolContainers
        ).map((node) => [node]);
    }

    return {
        compoundsNodes: compoundNodes,
        nodeGroups: nonCompoundNodes,
    };

    // return Promise.all([compoundTxtsPromises, nonCompoundTxtsPromises])
    //     .then((txts: IFileInfo[][]) => {
    //         // Merge the two arrays
    //         return txts[0].concat(txts[1]);
    //     });

    // .then((files: IFileInfo[]) => {
    //     return saveTxtFiles(files, filename);
    // });
}
