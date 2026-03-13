import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getConvertedTxts } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModelsUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";

export interface IMoleculeInputParams {
    molsToConsider?: IMolsToConsider;
    considerProteins?: boolean;
    considerCompounds?: boolean;
    proteinFormat?: string;
    compoundFormat?: string;
    includeMetalsAsProtein?: boolean;
    includeSolventAsProtein?: boolean;
    includeNucleicAsProtein?: boolean;
    allowUserToToggleIncludeMetalsAsProtein?: boolean;
    allowUserToToggleIncludeSolventAsProtein?: boolean;
    allowUserToToggleIncludeNucleicAsProtein?: boolean;
    // Below is useful if running things in webworkers. Sends input molecules or
    // molecule pairs in batches. If not specified, batching not applied (just
    // flat list of molecules). If set to null, batches according to nprocs.
    batchSize?: number | null | undefined;
    considerAllMoleculeTypes?: boolean;
}

export interface IProtCmpdTreeNodePair {
    prot: FileInfo;
    cmpd: FileInfo;
}

export interface IProtCmpdCounts {
    compounds: number;
    proteins: number;
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
    includeMetalsAsProtein = true;
    includeSolventAsProtein = true;
    includeNucleicAsProtein = true;
    allowUserToToggleIncludeMetalsAsProtein = true;
    allowUserToToggleIncludeSolventAsProtein = true;
    allowUserToToggleIncludeNucleicAsProtein = true;
    proteinFormat = "pdb";
    compoundFormat = "mol2";

    // No batching by default. null means batch according to nprocs.
    batchSize: number | null | undefined = undefined;

    // To identify this object as a molecule input, even when it's turned into a
    // JSON.
    isMoleculeInput = true;

    /**
     * When true, all terminal molecule types (proteins, compounds, nucleic
     * acids, metals, solvent, ions, lipids, etc.) are gathered into a single
     * flat list of FileInfo objects rather than being cross-paired as
     * protein/compound combinations.
     */
    considerAllMoleculeTypes = false;

    /**
     * The constructor for the MoleculeInput class.
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
        if (params.includeMetalsAsProtein !== undefined) {
            this.includeMetalsAsProtein = params.includeMetalsAsProtein;
        }
        if (params.includeSolventAsProtein !== undefined) {
            this.includeSolventAsProtein = params.includeSolventAsProtein;
        }
        if (params.includeNucleicAsProtein !== undefined) {
            this.includeNucleicAsProtein = params.includeNucleicAsProtein;
        }
        if (params.allowUserToToggleIncludeMetalsAsProtein !== undefined) {
            this.allowUserToToggleIncludeMetalsAsProtein =
                params.allowUserToToggleIncludeMetalsAsProtein;
        }
        if (params.allowUserToToggleIncludeSolventAsProtein !== undefined) {
            this.allowUserToToggleIncludeSolventAsProtein =
                params.allowUserToToggleIncludeSolventAsProtein;
        }
        if (params.allowUserToToggleIncludeNucleicAsProtein !== undefined) {
            this.allowUserToToggleIncludeNucleicAsProtein =
                params.allowUserToToggleIncludeNucleicAsProtein;
        }
        // If not specified, use the default batch size.
        if (params.batchSize !== undefined) {
            this.batchSize = params.batchSize;
        }
        if (params.considerAllMoleculeTypes !== undefined) {
            this.considerAllMoleculeTypes = params.considerAllMoleculeTypes;
        }
    }

    /**
     * Given a list of molecules, makes all pairs of proteins + compounds,
     * or returns a flat list of all molecules when considerAllMoleculeTypes
     * is true.
     * @returns {Promise<IProtCmpdTreeNodePair[] | FileInfo[]>} The protein,
     *     compound pairs, or a flat list of FileInfo objects.
     */
    public getProtAndCompoundPairs(): Promise<
        IProtCmpdTreeNodePair[] | FileInfo[]
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

        if (this.considerAllMoleculeTypes) {
            return this._getAllMoleculeTypeFileInfos(compiledMols);
        }

        const protFileInfoPromises = compiledMols.nodeGroups.map(
            (prots: TreeNodeList) => {
                if (!this.includeMetalsAsProtein) {
                    prots = prots.filter(
                        (p: TreeNode) =>
                            p.type !== TreeNodeType.Metal &&
                            p.type !== TreeNodeType.Ions
                    );
                }
                if (!this.includeSolventAsProtein) {
                    prots = prots.filter(
                        (p: TreeNode) => p.type !== TreeNodeType.Solvent
                    );
                }
                if (!this.includeNucleicAsProtein) {
                    prots = prots.filter(
                        (p: TreeNode) => p.type !== TreeNodeType.Nucleic
                    );
                }

                return getConvertedTxts(prots, this.proteinFormat, true).then(
                    (fileInfos: FileInfo[]) => {
                        return fileInfos[0];
                    }
                );
            }
        );

        let cmpdFileInfoPromise: Promise<any> = Promise.resolve();
        if (compiledMols.compoundsNodes) {
            cmpdFileInfoPromise = getConvertedTxts(
                compiledMols.compoundsNodes,
                this.compoundFormat,
                false
            );
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

    /**
     * Returns all molecules as a flat FileInfo array. In addition to proteins
     * and compounds from compileMolModels, this also gathers any other
     * terminal node types (nucleic acids, metals, solvent, ions, lipids) that
     * match the molsToConsider visibility/selection criteria, so that
     * "molecules" truly means all molecule types.
     *
     * @param {ReturnType<typeof compileMolModels>} compiledMols The compiled
     *     molecule groups from the store.
     * @returns {Promise<FileInfo[]>} A flat array of FileInfo objects for
     *     every molecule.
     */
    private async _getAllMoleculeTypeFileInfos(
        compiledMols: ReturnType<typeof compileMolModels>
    ): Promise<FileInfo[]> {
        const allFileInfos: FileInfo[] = [];

        // Collect IDs of nodes already handled by compileMolModels so we
        // don't duplicate them when we sweep for "other" node types below.
        const handledIds = new Set<string>();

        for (const prots of compiledMols.nodeGroups) {
            let filteredProts = prots;

            if (!this.includeMetalsAsProtein) {
                filteredProts = filteredProts.filter(
                    (p: TreeNode) =>
                        p.type !== TreeNodeType.Metal &&
                        p.type !== TreeNodeType.Ions
                );
            }
            if (!this.includeSolventAsProtein) {
                filteredProts = filteredProts.filter(
                    (p: TreeNode) => p.type !== TreeNodeType.Solvent
                );
            }
            if (!this.includeNucleicAsProtein) {
                filteredProts = filteredProts.filter(
                    (p: TreeNode) => p.type !== TreeNodeType.Nucleic
                );
            }

            // Track which nodes are being handled
            filteredProts.forEach((p: TreeNode) => {
                if (p.id) handledIds.add(p.id);
            });

            const protFileInfos = await getConvertedTxts(
                filteredProts,
                this.proteinFormat,
                true
            );
            allFileInfos.push(...protFileInfos.filter((f) => f !== undefined));
        }

        if (
            compiledMols.compoundsNodes &&
            compiledMols.compoundsNodes.length > 0
        ) {
            compiledMols.compoundsNodes.forEach((c: TreeNode) => {
                if (c.id) handledIds.add(c.id);
            });

            const cmpdFileInfos = await getConvertedTxts(
                compiledMols.compoundsNodes,
                this.compoundFormat,
                false
            );
            allFileInfos.push(...cmpdFileInfos.filter((f) => f !== undefined));
        }

        // Gather remaining terminal nodes (nucleic, metal, solvent, ions,
        // lipid, other) that compileMolModels did not already include.
        const allMols = getMoleculesFromStore();
        let candidates = allMols.flattened;

        if (
            this.molsToConsider.visible &&
            !this.molsToConsider.hiddenAndUnselected
        ) {
            candidates = candidates.filters.keepVisible(true);
        } else if (
            this.molsToConsider.selected &&
            !this.molsToConsider.hiddenAndUnselected
        ) {
            candidates = candidates.filters.keepSelected(true);
        }

        const remainingTerminals = candidates.filters.onlyTerminal.filter(
            (node: TreeNode) => {
                if (!node.id || handledIds.has(node.id)) return false;
                if (!node.model) return false;
                return true;
            }
        );

        if (remainingTerminals.length > 0) {
            // Convert these "other" nodes to PDB format (a safe default
            // that can represent any atom type).
            const otherFileInfos = await getConvertedTxts(
                remainingTerminals,
                "pdb",
                false
            );
            allFileInfos.push(
                ...otherFileInfos.filter((f) => f !== undefined)
            );
        }

        // Log included terminal node names for debugging
        console.log(
            "[MoleculeInput] Included terminal nodes:",
            allFileInfos.map((fi) => fi.treeNode?.title ?? fi.name)
        );

        return allFileInfos;
    }
}