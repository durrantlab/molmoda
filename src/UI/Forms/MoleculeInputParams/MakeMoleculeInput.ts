import { IFileInfo } from "@/FileSystem/Types";
import { IMoleculeInputParams } from "./Types";
import {
    ICmpdNonCmpdFileInfos,
    IMolsToConsider,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import {
    compileMolModels,
    convertCompiledMolModelsToIFileInfos,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";

/**
 * Given a list of molecules, makes all pairs of proteins + compounds.
 *
 * @param  {IMoleculeInputParams} molInputParams  Parameters that indicate
 *                                                whether to consider proteins
 *                                                and/or compounds, how proteins
 *                                                should be combined, etc.
 * @returns {Promise<IFileInfo[][]>}  A promise that resolves strings of the
 *     protein, compound pairs.
 */
export function makeMoleculeInput(
    molInputParams: IMoleculeInputParams
): Promise<IFileInfo[][]> {
    // let proteins: IFileInfo[] = [];
    // let proteinsPromise: Promise<IFileInfo[]> = Promise.resolve([]);
    // let compoundPromises: Promise<IFileInfo[]> = Promise.resolve([]);

    const molsToConsider = molInputParams.molsToConsider as IMolsToConsider;

    // Get compounds and non-compounds.
    const compiledMols = compileMolModels(molsToConsider, true);

    // Remove one or other, if required.
    if (!molInputParams.considerProteins) {
        compiledMols.nodeGroups = [];
    }
    if (!molInputParams.considerCompounds) {
        compiledMols.compoundsNodes = [];
    }

    return convertCompiledMolModelsToIFileInfos(
        compiledMols,
        molInputParams.compoundFormat,
        molInputParams.proteinFormat
    )
        .then((compoundNonCompoundFileInfos: ICmpdNonCmpdFileInfos) => {
            const proteinCompoundPairs: IFileInfo[][] = [];
            for (const protein of compoundNonCompoundFileInfos.nonCompoundFileInfos) {
                for (const compound of compoundNonCompoundFileInfos.compoundFileInfos) {
                    proteinCompoundPairs.push([protein, compound]);
                }
            }
            return proteinCompoundPairs;
        })
        .catch((err) => {
            console.warn(err);
            return [] as IFileInfo[][];
        });
}
