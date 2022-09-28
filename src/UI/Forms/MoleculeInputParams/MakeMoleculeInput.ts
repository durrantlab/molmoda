import { convertToPDB } from "@/FileSystem/LoadSaveMolModels/ConvertToPDB";
import {
    GLModel,
    IMolContainer,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    CombineProteinType,
    IMoleculeInputParams,
    MolsToUse,
} from "./MoleculeInputParamsTypes";
import * as api from "@/Api";
import { slugify } from "@/Core/Utils";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { getMolDescription } from "@/UI/Navigation/TreeView/TreeUtils";

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
 * @returns {IFileInfo[]}  The PDB-formatted strings of the merged molecules
 *     (always containing only one string in this case).
 */
function _mergeAllProteins(
    molsToUse: MolsToUse,
    molContainers: IMolContainer[]
): IFileInfo[] {
    // Get all the chains.
    const proteinChains = api.visualization.getProteinChainsToUse(
        molsToUse,
        molContainers
    );

    // Make PDB strings for each molecule (one molecule in this case).
    const pdbTxt = convertToPDB(
        proteinChains.map((node) => node.model) as GLModel[],
        true // merge
    )[0];

    // Make the filename
    // const proteins = api.visualization.getProteinsToUse(
    //     molsToUse,
    //     molContainers
    // );
    // let filename = proteins.map((node) => node.title).join("__");
    // filename = slugify(filename) + ".pdb";
    const filename = "all_proteins.pdb";

    return [
        {
            name: filename,
            contents: pdbTxt,
            type: "PDB",
        },
    ] as IFileInfo[];
}

/**
 * Merge all chains of each protein into one molecule, but keep the proteins
 * separate.
 *
 * @param  {MolsToUse}        molsToUse     The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {IFileInfo[]}  The PDB-formatted strings of the merged molecules.
 */
function _mergePerProtein(
    molsToUse: MolsToUse,
    molContainers: IMolContainer[]
): IFileInfo[] {
    // Get all the proteins.
    const proteins = api.visualization.getProteinsToUse(
        molsToUse,
        molContainers
    );

    const pdbFiles: IFileInfo[] = [];

    for (const protein of proteins) {
        const mergedProteinFile = _mergeAllProteins(molsToUse, [protein])[0];

        // Get the title of the parent node (if it exists)
        const filename = _makeTmpFilename(protein, molContainers);
        mergedProteinFile.name = filename;

        pdbFiles.push(mergedProteinFile);
    }

    return pdbFiles;
}

/**
 * Consider each protein chain to be a separate protein.
 *
 * @param  {MolsToUse}        molsToUse     The kinds of molecule properties to
 *                                          filter by.
 * @param  {IMolContainer[]} molContainers  The list of molecules with protein
 *                                          chains (among other things).
 * @returns {IFileInfo[]}  The PDB-formatted strings of the chains.
 */
function _perChain(
    molsToUse: MolsToUse,
    molContainers: IMolContainer[]
): IFileInfo[] {
    // Get all the chains.
    const proteinChains = api.visualization.getProteinChainsToUse(
        molsToUse,
        molContainers
    );

    // Make PDB strings for each molecule (one molecule in this case).
    const files: IFileInfo[] = [];
    for (const chain of proteinChains) {
        const pdbTxt = convertToPDB([chain.model] as GLModel[], true)[0];

        // Get filename
        const filename = _makeTmpFilename(chain, molContainers);

        files.push({
            name: filename,
            contents: pdbTxt,
            type: "PDB",
        });
    }
    return files;
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
 * @returns {IFileInfo[][]}  The PDB-formatted strings of the protein, compound
 *     pairs.
 */
export function makeMoleculeInput(
    molInputParams: IMoleculeInputParams,
    molContainers: IMolContainer[]
): IFileInfo[][] {
    let proteins: IFileInfo[] = [];
    if (molInputParams.considerProteins) {
        switch (molInputParams.combineProteinType) {
            case CombineProteinType.MERGE_ALL:
                proteins = _mergeAllProteins(
                    molInputParams.molsToUse,
                    molContainers
                );
                break;
            case CombineProteinType.PER_PROTEIN:
                proteins = _mergePerProtein(
                    molInputParams.molsToUse,
                    molContainers
                );
                break;
            case CombineProteinType.PER_CHAIN:
                proteins = _perChain(molInputParams.molsToUse, molContainers);
                break;
        }
    }

    const compounds: IFileInfo[] = [];
    if (molInputParams.considerCompounds) {
        const compoundMols = api.visualization.getCompoundsToUse(
            molInputParams.molsToUse,
            molContainers
        );
        for (const compound of compoundMols) {
            const pdbTxt = convertToPDB(
                [compound.model] as GLModel[],
                false
            )[0];

            // Get filename
            const filename = _makeTmpFilename(compound, molContainers); // .replace("-compounds-", "-");

            compounds.push({
                name: filename,
                contents: pdbTxt,
                type: "PDB",
            });
        }
    }

    const proteinCompoundPairs: IFileInfo[][] = [];
    for (const protein of proteins) {
        for (const compound of compounds) {
            proteinCompoundPairs.push([protein, compound]);
        }
    }

    return proteinCompoundPairs;
}
