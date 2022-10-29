import { ISaveTxt } from "@/Core/FS";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import { MolsToUse } from "@/UI/Forms/MoleculeInputParams/Definitions";
import { getTerminalNodesToUse } from "@/UI/Forms/MoleculeInputParams/WhichMols";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { getPrimaryExt, getSaveTxtPromises, saveTxtFiles } from "./Utils";

/**
 * Runs the job when the user wants to save in a non-biotite format, all
 * molecules together.
 *
 * @param {string}    filename   The filename to save to.
 * @param {MolsToUse} molsToUse  The molecules to save.
 * @param {string}    format     The format to save in.
 * @returns {Promise<undefined>}  A promise that resolves when the job is done.
 */
 export function saveAll(
    filename: string,
    molsToUse: MolsToUse,
    format: string
): Promise<undefined> {
    // Not using biotite format. Create ZIP file with protein and small
    // molecules.
    const targetExt = getPrimaryExt(format);

    const mols = getStoreVar("molecules");

    const terminalNodes = getTerminalNodes(mols);

    const nodesToUse = getTerminalNodesToUse(molsToUse, terminalNodes);

    // filename = mols.map((m: IMolContainer) => slugify(m.title)).join("_");

    return getSaveTxtPromises(
        nodesToUse,
        targetExt,
        true, // Merge everything
        filename
    ).then((files: ISaveTxt[]) => {
        return saveTxtFiles(files, filename);
    });
}