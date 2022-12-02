import { IFileInfo } from "@/FileSystem/Types";
import {
    ICmpdNonCmpdFileInfos,
    IMolsToConsider,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import {
    compileMolModels,
    convertCompiledMolModelsToIFileInfos,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";

export interface IMoleculeInputParams {
    molsToConsider?: IMolsToConsider;
    considerProteins?: boolean;
    considerCompounds?: boolean;
    proteinFormat?: string;
    compoundFormat?: string;
}

export class MoleculeInput {
    molsToConsider = {
        visible: true,
        selected: true,
        hiddenAndUnselected: false,
    } as IMolsToConsider;
    considerProteins = true;
    considerCompounds = true;
    proteinFormat = "pdb";
    compoundFormat = "mol2";
    
    // To identify this object as a molecule input, even when it's turned into a
    // JSON.
    isMoleculeInput = true;  

    constructor(params?: IMoleculeInputParams) {
        if (params === undefined) {
            return;
        }

        if (params.molsToConsider !== undefined) {
            this.molsToConsider = params.molsToConsider;
        }
        if (params.considerProteins !== undefined) {
            this.considerProteins = params.considerProteins;
        }
        if (params.considerCompounds !== undefined) {
            this.considerCompounds = params.considerCompounds;
        }
        if (params.proteinFormat !== undefined) {
            this.proteinFormat = params.proteinFormat;
        }
        if (params.compoundFormat !== undefined) {
            this.compoundFormat = params.compoundFormat;
        }
    }

    /**
     * Given a list of molecules, makes all pairs of proteins + compounds.
     *
     * @returns {Promise<IFileInfo[][] | IFileInfo[] >}  A promise that resolves
     *     strings of the protein, compound pairs (if appropriate), or just proteins
     *     or just compounds.
     */
    public getFileInfos(): Promise<IFileInfo[][] | IFileInfo[]> {
        // let proteins: IFileInfo[] = [];
        // let proteinsPromise: Promise<IFileInfo[]> = Promise.resolve([]);
        // let compoundPromises: Promise<IFileInfo[]> = Promise.resolve([]);

        // Get compounds and non-compounds.
        const compiledMols = compileMolModels(this.molsToConsider, true);

        // Remove one or other, if required.
        if (!this.considerProteins) {
            compiledMols.nodeGroups = [];
        }
        if (!this.considerCompounds) {
            compiledMols.compoundsNodes = [];
        }

        debugger;

        return convertCompiledMolModelsToIFileInfos(
            compiledMols,
            this.compoundFormat,
            this.proteinFormat
        )
            .then((compoundNonCompoundFileInfos: ICmpdNonCmpdFileInfos) => {
                if (
                    compoundNonCompoundFileInfos.nonCompoundFileInfos.length >
                        0 &&
                    compoundNonCompoundFileInfos.compoundFileInfos.length > 0
                ) {
                    // Both proteins and compounds, so get all pairs.
                    const proteinCompoundPairs: IFileInfo[][] = [];
                    for (const protein of compoundNonCompoundFileInfos.nonCompoundFileInfos) {
                        for (const compound of compoundNonCompoundFileInfos.compoundFileInfos) {
                            proteinCompoundPairs.push([protein, compound]);
                        }
                    }
                    return proteinCompoundPairs;
                }

                if (compoundNonCompoundFileInfos.compoundFileInfos.length > 0) {
                    // Just compounds.
                    return compoundNonCompoundFileInfos.compoundFileInfos;
                }

                // Just proteins
                return compoundNonCompoundFileInfos.nonCompoundFileInfos;
            })
            .catch((err) => {
                console.warn(err);
                return [] as IFileInfo[][];
            });
    }
}
