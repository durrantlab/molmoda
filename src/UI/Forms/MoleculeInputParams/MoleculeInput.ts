import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getConvertedTxts } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

export interface IMoleculeInputParams {
    molsToConsider?: IMolsToConsider;
    considerProteins?: boolean;
    considerCompounds?: boolean;
    proteinFormat?: string;
    compoundFormat?: string;

    // Below is useful if running things in webworkers. Sends input molecules or
    // molecule pairs in batches. If not specified, batching not applied (just
    // flat list of molecules). If set to null, batches according to nprocs.
    batchSize?: number | null | undefined;
}

export interface IProtCmpdMolContainerPair {
    prot: FileInfo;
    cmpd: FileInfo;
}

/**
 * MoleculeInput class.
 */
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

    // No batching by default. null means batch according to nprocs.
    batchSize: number | null | undefined = undefined;

    // To identify this object as a molecule input, even when it's turned into a
    // JSON.
    isMoleculeInput = true;

    /**
     * The constructor for the MoleculeInput class.
     * 
     * @param {IMoleculeInputParams} params  The parameters of the MoleculeInput
     *     object.
     */
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

        // If not specified, use the default batch size.
        if (params.batchSize !== undefined) {
            this.batchSize = params.batchSize;
        }
    }

    /**
     * Given a list of molecules, makes all pairs of proteins + compounds.
     *
     * @returns {Promise<IProtCmpdMolContainerPair[]>}  The protein, compound pairs.
     */
    public getProtCompounds(): Promise<
        | IProtCmpdMolContainerPair[]
        | FileInfo[]
        | IProtCmpdMolContainerPair[][]
        | FileInfo[][]
    > {
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

        const protFileInfoPromises = compiledMols.nodeGroups.map(
            (prots: IMolContainer[]) => {
                return getConvertedTxts(prots, "pdb", true).then(
                    (fileInfos: FileInfo[]) => {
                        // There's only one
                        return fileInfos[0];
                    }
                );
            }
        );

        let cmpdFileInfoPromises: Promise<FileInfo>[] = [];
        if (compiledMols.compoundsNodes) {
            cmpdFileInfoPromises = compiledMols.compoundsNodes.map(
                (cmpds: IMolContainer) => {
                    // TODO: Is PDB the right format for a compound?
                    return getConvertedTxts([cmpds], "pdb", true).then(
                        (fileInfos: FileInfo[]) => {
                            // There's only one
                            return fileInfos[0];
                        }
                    );
                }
            );
        }

        const allProtPromises = Promise.all(protFileInfoPromises);
        const allCmpdPromises = Promise.all(cmpdFileInfoPromises);

        return Promise.all([allProtPromises, allCmpdPromises])
            .then((payload: FileInfo[][]) => {
                let [prots, cmpds] = payload;

                // Remove any undefineds. This happens when there are no
                // proteins and/or compounds loaded.
                prots = prots.filter((p: FileInfo) => p !== undefined);
                cmpds = cmpds.filter((c: FileInfo) => c !== undefined);

                const proteinCompoundPairs: IProtCmpdMolContainerPair[] = [];
                if (prots.length > 0 && cmpds.length > 0) {
                    // Both proteins and compounds, so get every pairing.
                    for (const prot of prots) {
                        for (const cmpd of cmpds) {
                            proteinCompoundPairs.push({
                                prot: prot,
                                cmpd: cmpd,
                            } as IProtCmpdMolContainerPair);
                        }
                    }
                    return this._makeBatches(proteinCompoundPairs);
                }

                if (cmpds.length > 0) {
                    // Just compounds.
                    return this._makeBatches(cmpds);
                    // .map((c: FileInfo) => {
                    //     return {
                    //         cmpd: c,
                    //     } as IProtCmpdMolContainerPair;
                    // });
                }

                return this._makeBatches(prots);
                // .map((p) => {
                //     return {
                //         prot: p,
                //     } as IProtCmpdMolContainerPair;
                // });
            })
            .catch((err: Error) => {
                throw err;
                // return [];
            });
    }

    /**
     * Given a list of items, divide the list into batches.
     * 
     * @param {any[]} lst  The list of items.
     * @returns {any[] | any[][]}  The list of items, divided into batches.
     */
    private _makeBatches<Type>(lst: Type[]): Type[] | Type[][] {
        if (this.batchSize === undefined) {
            // No batching
            return lst;
        }

        if (this.batchSize === null) {
            // Batch per the number of available processors
            this.batchSize = Math.ceil(lst.length / getSetting("maxProcs"));
        }

        const batches: Type[][] = [];
        for (let i = 0; i < lst.length; i += this.batchSize) {
            batches.push(lst.slice(i, i + this.batchSize));
        }
        return batches;
    }
}
