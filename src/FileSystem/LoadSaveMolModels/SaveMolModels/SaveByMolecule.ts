import { ISaveTxt } from "@/Core/FS";
import { slugify } from "@/Core/Utils";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import { MolsToUse } from "@/UI/Forms/MoleculeInputParams/Definitions";
import { getTerminalNodesToUse } from "@/UI/Forms/MoleculeInputParams/WhichMols";
import {
    getSaveTxtPromises,
    getPrimaryExt,
    saveTxtFiles,
    separateCompoundNonCompoundTerminalNodes,
} from "./Utils";

/**
 * Runs the job when the user wants to save in a non-biotite format, by
 * molecule.
 *
 * @param {string}    filename        The filename to save to.
 * @param {MolsToUse} molsToUse      The molecules to save.
 * @param {string}    compoundFormat  The format to save compounds in.
 * @param {string}    proteinFormat   The format to save proteins in.
 * @returns {Promise<undefined>}  A promise that resolves when the job is done.
 */
export function saveByMolecule(
    filename: string,
    molsToUse: MolsToUse,
    compoundFormat: string,
    proteinFormat: string
): Promise<undefined> {
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.
    const compoundExt = getPrimaryExt(compoundFormat);
    const proteinExt = getPrimaryExt(proteinFormat);

    const promises: Promise<any>[] = [];

    for (const molContainer of getStoreVar("molecules")) {
        const nodesToConsider = [molContainer];
        if (molContainer.nodes) {
            nodesToConsider.push(...molContainer.nodes);
        }
        const terminalNodes =
            separateCompoundNonCompoundTerminalNodes(nodesToConsider);

        const compoundNodes = getTerminalNodesToUse(
            molsToUse,
            terminalNodes.compoundNodes
        );

        const nonCompoundNodes = getTerminalNodesToUse(
            molsToUse,
            terminalNodes.nonCompoundNodes
        );

        if (compoundNodes.length > 0) {
            promises.push(
                getSaveTxtPromises(
                    compoundNodes,
                    compoundExt,
                    false // Never merge compound chains
                )
            );
        }

        if (nonCompoundNodes.length > 0) {
            promises.push(
                getSaveTxtPromises(
                    nonCompoundNodes,
                    proteinExt,
                    true, // Do merge all non-compound chains
                    slugify(molContainer.title)
                )
            );
        }
    }

    return Promise.all(promises)
        .then((txts: ISaveTxt[][]) => {
            // Merge the two arrays
            const allTxts = [];
            for (const txtArray of txts) {
                allTxts.push(...txtArray);
            }
            return allTxts;
        })
        .then((files: ISaveTxt[]) => {
            return saveTxtFiles(files, filename);
        });
}
