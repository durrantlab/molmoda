import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getConvertedTxts } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModelsUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface IMoleculeInputParams {
    molsToConsider?: IMolsToConsider;
    considerProteins?: boolean;
    considerCompounds?: boolean;
    proteinFormat?: string;
    compoundFormat?: string;
    includeMetalsSolventAsProtein?: boolean;
    allowUserToToggleIncludeMetalsSolventAsProtein?: boolean;

    // Below is useful if running things in webworkers. Sends input molecules or
    // molecule pairs in batches. If not specified, batching not applied (just
    // flat list of molecules). If set to null, batches according to nprocs.
    batchSize?: number | null | undefined;
}

export interface IProtCmpdTreeNodePair {
    prot: FileInfo;
    cmpd: FileInfo;
}

/**
 * MoleculeInput class.
 */
export class MoleculeInput {
    molsToConsider = {
        visible: true,
        selected: false,
        hiddenAndUnselected: false,
    } as IMolsToConsider;
    considerProteins = true;
    considerCompounds = true;
    includeMetalsSolventAsProtein = true;
    allowUserToToggleIncludeMetalsSolventAsProtein = true;
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
        if (params.includeMetalsSolventAsProtein !== undefined) {
            this.includeMetalsSolventAsProtein = params.includeMetalsSolventAsProtein;
        }
        if (params.allowUserToToggleIncludeMetalsSolventAsProtein !== undefined) {
            this.allowUserToToggleIncludeMetalsSolventAsProtein = params.allowUserToToggleIncludeMetalsSolventAsProtein;
        }

        // If not specified, use the default batch size.
        if (params.batchSize !== undefined) {
            this.batchSize = params.batchSize;
        }
    }

    /**
     * Given a list of molecules, makes all pairs of proteins + compounds.
     *
     * @returns {Promise<IProtCmpdTreeNodePair[]>}  The protein, compound pairs.
     */
    public getProtAndCompoundPairs(): Promise<
        | IProtCmpdTreeNodePair[]
        | FileInfo[]
        // | IProtCmpdTreeNodePair[][]
        // | FileInfo[][]
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
            compiledMols.compoundsNodes = new TreeNodeList();
        }

        const protFileInfoPromises = compiledMols.nodeGroups.map(
            (prots: TreeNodeList) => {
                // Keep only protein if so specified.
                if (!this.includeMetalsSolventAsProtein) {
                    prots = prots.filter((p: TreeNode) => {
                        return p.type === TreeNodeType.Protein
                    });
                }

                // return getConvertedTxts(prots, "pdb", true).then(
                return getConvertedTxts(prots, this.proteinFormat, true).then(
                    (fileInfos: FileInfo[]) => {
                        // There's only one
                        return fileInfos[0];
                    }
                );
            }
        );

        // let cmpdFileInfoPromises: Promise<FileInfo>[] = [];
        let cmpdFileInfoPromise: Promise<any> = Promise.resolve();
        if (compiledMols.compoundsNodes) {
            // cmpdFileInfoPromise = getConvertedTxts(compiledMols.compoundsNodes, "pdb", false);
            cmpdFileInfoPromise = getConvertedTxts(compiledMols.compoundsNodes, this.compoundFormat, false);
        }

        const allProtPromises = Promise.all(protFileInfoPromises);
        // const allCmpdPromises = Promise.all(cmpdFileInfoPromises);

        return Promise.all([allProtPromises, cmpdFileInfoPromise])
            .then((payload: FileInfo[][]) => {
                let [prots, cmpds] = payload;
                
                // Remove any undefineds. This happens when there are no
                // proteins and/or compounds loaded.
                prots = prots.filter((p: FileInfo) => p !== undefined);
                cmpds = cmpds.filter((c: FileInfo) => c !== undefined);

                const proteinCompoundPairs: IProtCmpdTreeNodePair[] = [];
                if (prots.length > 0 && cmpds.length > 0) {
                    // Both proteins and compounds, so get every pairing.
                    for (const prot of prots) {
                        for (const cmpd of cmpds) {
                            proteinCompoundPairs.push({
                                prot: prot,
                                cmpd: cmpd,
                            } as IProtCmpdTreeNodePair);
                        }
                    }
                    // return this._makeBatches(proteinCompoundPairs);
                    return proteinCompoundPairs;
                }

                if (cmpds.length > 0) {
                    // Just compounds.
                    // return this._makeBatches(cmpds);
                    return cmpds;
                }

                // return this._makeBatches(prots);
                return prots;
            })
            .catch((err: Error) => {
                throw err;
            });
    }

    // /**
    //  * Given a list of items, divide the list into batches.
    //  * 
    //  * @param {any[]} lst  The list of items.
    //  * @returns {any[] | any[][]}  The list of items, divided into batches.
    //  */
    // private _makeBatches<Type>(lst: Type[]): Type[] | Type[][] {
    //     if (this.batchSize === undefined) {
    //         // No batching
    //         return lst;
    //     }

    //     return batchify(lst, this.batchSize);
    // }
}
