import { ISaveTxt } from "@/Core/FS";
import { MolsToUse } from "@/UI/Forms/MoleculeInputParams/Definitions";
import { getTerminalNodesToUse } from "@/UI/Forms/MoleculeInputParams/WhichMols";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import {
    getPrimaryExt,
    getSaveTxtPromises,
    saveTxtFiles,
    separateCompoundNonCompoundTerminalNodes,
} from "./Utils";

/**
 * Runs the job when the user wants to save in a non-biotite format, by chain.
 *
 * @param {string}    filename        The filename to save to.
 * @param {MolsToUse} molsToUse      The molecules to save.
 * @param {string}    compoundFormat  The format to save compounds in.
 * @param {string}    proteinFormat   The format to save proteins in.
 * @returns {Promise<undefined>}  A promise that resolves when the job is done.
 */
export function saveByChain(
    filename: string,
    molsToUse: MolsToUse,
    compoundFormat: string,
    proteinFormat: string
): Promise<undefined> {
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.
    const compoundExt = getPrimaryExt(compoundFormat);
    const proteinExt = getPrimaryExt(proteinFormat);

    const terminalNodes = separateCompoundNonCompoundTerminalNodes(
        getStoreVar("molecules")
    );

    const compoundNodes = getTerminalNodesToUse(
        molsToUse,
        terminalNodes.compoundNodes
    );

    const nonCompoundNodes = getTerminalNodesToUse(
        molsToUse,
        terminalNodes.nonCompoundNodes
    );

    const compoundTxtsPromises = getSaveTxtPromises(
        compoundNodes,
        compoundExt,
        false // Never merge compound chains
    );

    const nonCompoundTxtsPromises = getSaveTxtPromises(
        nonCompoundNodes,
        proteinExt,
        false // Don't merge protein chains
    );

    return Promise.all([compoundTxtsPromises, nonCompoundTxtsPromises])
        .then((txts: ISaveTxt[][]) => {
            // Merge the two arrays
            return txts[0].concat(txts[1]);
        })
        .then((files: ISaveTxt[]) => {
            return saveTxtFiles(files, filename);
        });
}
