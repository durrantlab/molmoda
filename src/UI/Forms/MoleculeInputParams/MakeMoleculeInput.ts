import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { slugify } from "@/Core/Utils";
import { correctFilenameExt, IFileInfo } from "@/FileSystem/Types";
import {
    getCompoundsToUse,
    getMolDescription,
    getProteinChainsToUse,
    getProteinsToUse,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { convertMolContainers } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/ConvertMolContainer";
import { IMoleculeInputParams } from "./Types";
import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";

// function _getNameOfParent(
//     mol: IMolContainer,
//     molContainers: IMolContainer[]
// ): string | undefined {
//     if (mol.parentId) {
//         const parentNode = getNodeOfId(mol.parentId, molContainers);
//         if (parentNode) {
//             return getFileNameParts(parentNode.title).basename
//         }
//     }
//     return undefined;
// }

/**
 * Makes a temporary filename.
 *
 * @param  {IMolContainer}   mol            The molecule to make a filename for.
 * @param  {IMolContainer[]} molContainers  The list of all molecules.
 * @returns {string}  The filename.
 */
function _makeTmpFilename(
    mol: IMolContainer,
    molContainers: IMolContainer[]
): string {
    let filename = getMolDescription(mol, molContainers);
    filename = slugify(filename) + ".pdb";
    return filename;
}

/**
 * Merge all protein chains into one molecule.
 *
 * @param  {IMolsToConsider} molsToConsider The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {Promise<IFileInfo[]>}  The promise that resolves PDB-formatted
 *     strings of the merged molecules (always containing only one string in
 *     this case).
 */
function _mergeAllProteins(
    molsToConsider: IMolsToConsider,
    molContainers: IMolContainer[]
): Promise<IFileInfo[]> {
    // Get all the chains.
    const proteinChains = getProteinChainsToUse(molsToConsider, molContainers);

    // Make PDB strings for each molecule (one molecule in this case).
    return convertMolContainers(
        proteinChains,
        "pdb",
        true // merge
    ).then((pdbTxts: string[]) => {
        // One molecule in this case.
        const pdbTxt = pdbTxts[0];
        const filename = "all_proteins.pdb";

        return [
            {
                name: correctFilenameExt(filename, "PDB"),
                contents: pdbTxt,
            },
        ] as IFileInfo[];
    });
}

/**
 * Merge all chains of each protein into one molecule, but keep the proteins
 * separate.
 *
 * @param  {IMolsToConsider} molsToConsider The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {Promise<IFileInfo[]>}  A promise that resolves to the PDB-formatted
 *     strings of the merged molecules.
 */
function _mergePerProtein(
    molsToConsider: IMolsToConsider,
    molContainers: IMolContainer[]
): Promise<IFileInfo[]> {
    // Get all the proteins.
    const proteins = getProteinsToUse(molsToConsider, molContainers);

    const filenames: string[] = [];
    const mergedProteinFilesPromises: Promise<IFileInfo[]>[] = [];
    for (const protein of proteins) {
        mergedProteinFilesPromises.push(
            _mergeAllProteins(molsToConsider, [protein])
        );
        filenames.push(_makeTmpFilename(protein, molContainers));
    }

    return Promise.all(mergedProteinFilesPromises).then(
        (mergedProteinFiles: IFileInfo[][]) => {
            const pdbFiles: IFileInfo[] = [];

            for (let idx = 0; idx < mergedProteinFiles.length; idx++) {
                const mergedProteinFile = mergedProteinFiles[idx][0];
                const filename = filenames[idx];
                mergedProteinFile.name = filename;
                pdbFiles.push(mergedProteinFile);
            }

            return pdbFiles;
        }
    );
}

/**
 * Given a list of molecules, makes all pairs of proteins + compounds.
 *
 * @param  {IMoleculeInputParams} molInputParams  Parameters that indicate
 *                                                whether to consider proteins
 *                                                and/or compounds, how proteins
 *                                                should be combined, etc.
 * @param  {IMolContainer[]}      molContainers   The list of molecules with
 *                                                proteins, compounds (among
 *                                                other things).
 * @returns {Promise<IFileInfo[][]>}  A promise that resolves PDB-formatted
 *     strings of the protein, compound pairs.
 */
export function makeMoleculeInput(
    molInputParams: IMoleculeInputParams,
    molContainers: IMolContainer[]
): Promise<IFileInfo[][]> {
    // let proteins: IFileInfo[] = [];
    let proteinsPromise: Promise<IFileInfo[]> = Promise.resolve([]);
    let compoundPromises: Promise<IFileInfo[]> = Promise.resolve([]);

    if (molInputParams.considerProteins) {
        proteinsPromise = _mergePerProtein(
            molInputParams.molsToConsider,
            molContainers
        );
    }

    if (molInputParams.considerCompounds) {
        const compoundMols = getCompoundsToUse(
            molInputParams.molsToConsider,
            molContainers
        );

        const compoundConvertedPromises: Promise<string[]>[] = [];
        const filenames: string[] = [];

        for (const compound of compoundMols) {
            filenames.push(_makeTmpFilename(compound, molContainers));
            compoundConvertedPromises.push(
                convertMolContainers([compound], "pdb", false)
            );
        }

        compoundPromises = Promise.all(compoundConvertedPromises).then(
            (pdbTxts: string[][]) => {
                const compounds: IFileInfo[] = [];
                for (let idx = 0; idx < pdbTxts.length; idx++) {
                    const pdbTxt = pdbTxts[idx][0];
                    compounds.push({
                        name: filenames[idx],
                        contents: pdbTxt,
                        // type: "PDB",
                    } as IFileInfo);
                }
                return compounds;
            }
        );

        // for (const compound of compoundMols) {
        //     const pdbTxt = convertMolContainer([compound], "pdb", false)[0];

        //     // Get filename
        //     const filename = _makeTmpFilename(compound, molContainers); // .replace("-compounds-", "-");

        //     compounds.push({
        //         name: filename,
        //         contents: pdbTxt,
        //         type: "PDB",
        //     });
        // }
    }

    return Promise.all([proteinsPromise, compoundPromises])
        .then((results: IFileInfo[][]) => {
            const proteinCompoundPairs: IFileInfo[][] = [];
            const proteins = results[0];
            const compounds = results[1];
            for (const protein of proteins) {
                for (const compound of compounds) {
                    proteinCompoundPairs.push([protein, compound]);
                }
            }

            return proteinCompoundPairs;
        })
        .catch((err) => {
            console.error(err);
            throw err;
        });
}
