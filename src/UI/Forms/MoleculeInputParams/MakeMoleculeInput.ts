import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import * as api from "@/Api";
import { slugify } from "@/Core/Utils";
import { IFileInfo } from "@/FileSystem/Types";
import { getMolDescription } from "@/UI/Navigation/TreeView/TreeUtils";
import { convertMolContainers } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/ConvertMolContainer";
import { CombineProteinType, IMoleculeInputParams, MolsToUse } from "./Types";

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

    // debugger;

    // // let filename = mol.title;
    // const nameOfParent = _getNameOfParent(mol, molContainers);
    // if (nameOfParent) {
    //     filename = nameOfParent + "__" + filename;
    //     const parent = getNodeOfId(mol.parentId as string, molContainers)
    //     if (parent) {
    //         const nameOfParentParent = _getNameOfParent(parent, molContainers);
    //         if (nameOfParentParent) {
    //             filename = nameOfParentParent + "__" + filename;
    //         }
    //     }
    // }
    // filename = slugify(filename) + ".pdb";
    return filename;
}

/**
 * Merge all protein chains into one molecule.
 *
 * @param  {MolsToUse}        molsToUse     The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {Promise<IFileInfo[]>}  The promise that resolves PDB-formatted
 *     strings of the merged molecules (always containing only one string in
 *     this case).
 */
function _mergeAllProteins(
    molsToUse: MolsToUse,
    molContainers: IMolContainer[]
): Promise<IFileInfo[]> {
    // Get all the chains.
    const proteinChains = api.visualization.getProteinChainsToUse(
        molsToUse,
        molContainers
    );

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
                name: filename,
                contents: pdbTxt,
                type: "PDB",
            },
        ] as IFileInfo[];
    });

    // Make the filename
    // const proteins = api.visualization.getProteinsToUse(
    //     molsToUse,
    //     molContainers
    // );
    // let filename = proteins.map((node) => node.title).join("__");
    // filename = slugify(filename) + ".pdb";
}

/**
 * Merge all chains of each protein into one molecule, but keep the proteins
 * separate.
 *
 * @param  {MolsToUse}        molsToUse     The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {Promise<IFileInfo[]>}  A promise that resolves to the PDB-formatted
 *     strings of the merged molecules.
 */
function _mergePerProtein(
    molsToUse: MolsToUse,
    molContainers: IMolContainer[]
): Promise<IFileInfo[]> {
    // Get all the proteins.
    const proteins = api.visualization.getProteinsToUse(
        molsToUse,
        molContainers
    );

    const filenames: string[] = [];
    const mergedProteinFilesPromises: Promise<IFileInfo[]>[] = [];
    for (const protein of proteins) {
        mergedProteinFilesPromises.push(
            _mergeAllProteins(molsToUse, [protein])
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
            // mergedProteinFiles = mergedProteinFiles.map(m => m[0]);
        }
    );

    // return proteins.map((protein) => {
    //     return _mergeAllProteins(molsToUse, [protein]);
    // })
    // .then((mergedProteinFiles: IFileInfo[][]) => {
    //     const pdbFiles: IFileInfo[] = [];

    //     for (const mergedProteinFl of mergedProteinFiles) {
    //         const mergedProteinFile = mergedProteinFl[0];
    //         const filename = _makeTmpFilename(protein, molContainers);
    //         mergedProteinFile.name = filename;
    //         pdbFiles.push(mergedProteinFile);
    //     }

    //     return pdbFiles;
    //     // mergedProteinFiles = mergedProteinFiles.map(m => m[0]);

    // });

    // const pdbFiles: IFileInfo[] = [];

    // for (const protein of proteins) {
    //     const mergedProteinFile = _mergeAllProteins(molsToUse, [protein])[0];

    //     // Get the title of the parent node (if it exists)
    //     const filename = _makeTmpFilename(protein, molContainers);
    //     mergedProteinFile.name = filename;

    //     pdbFiles.push(mergedProteinFile);
    // }

    // return pdbFiles;
}

/**
 * Consider each protein chain to be a separate protein.
 *
 * @param  {MolsToUse}        molsToUse     The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {Promise<IFileInfo[]>}  A promise that resolves the PDB-formatted
 *     strings of the chains.
 */
function _perChain(
    molsToUse: MolsToUse,
    molContainers: IMolContainer[]
): Promise<IFileInfo[]> {
    // Get all the chains.
    const proteinChains = api.visualization.getProteinChainsToUse(
        molsToUse,
        molContainers
    );

    const filePromises: Promise<string[]>[] = [];
    const filenames: string[] = [];

    for (const chain of proteinChains) {
        filenames.push(_makeTmpFilename(chain, molContainers));
        filePromises.push(convertMolContainers([chain], "pdb", true));
    }

    return Promise.all(filePromises).then((pdbTxts: string[][]) => {
        const files: IFileInfo[] = [];
        for (let idx = 0; idx < pdbTxts.length; idx++) {
            const pdbTxt = pdbTxts[idx][0];
            files.push({
                name: filenames[idx],
                contents: pdbTxt,
                type: "PDB",
            });
        }
        return files;
    });

    // Make PDB strings for each molecule (one molecule in this case).
    // for (const chain of proteinChains) {
    //     const pdbTxt = convertMolContainer([chain], "pdb", true)[0];

    //     // Get filename
    //     const filename = _makeTmpFilename(chain, molContainers);

    //     files.push({
    //         name: filename,
    //         contents: pdbTxt,
    //         type: "PDB",
    //     });
    // }
    // return files;
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
        switch (molInputParams.combineProteinType) {
            case CombineProteinType.MergeAll:
                proteinsPromise = _mergeAllProteins(
                    molInputParams.molsToUse,
                    molContainers
                );
                break;
            case CombineProteinType.PerProtein:
                proteinsPromise = _mergePerProtein(
                    molInputParams.molsToUse,
                    molContainers
                );
                break;
            case CombineProteinType.PerChain:
                proteinsPromise = _perChain(
                    molInputParams.molsToUse,
                    molContainers
                );
                break;
        }
    }

    if (molInputParams.considerCompounds) {
        const compoundMols = api.visualization.getCompoundsToUse(
            molInputParams.molsToUse,
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
                const compounds = [];
                for (let idx = 0; idx < pdbTxts.length; idx++) {
                    const pdbTxt = pdbTxts[idx][0];
                    compounds.push({
                        name: filenames[idx],
                        contents: pdbTxt,
                        type: "PDB",
                    });
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
