import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { compileMolModels } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getConvertedTxts } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModelsUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";

/**
 * Controls how selected molecules are processed by a plugin.
 *
 * - `separate`:  Each molecule is processed independently, producing one
 *                result per molecule. (e.g., protonating each compound)
 * - `pairwise`:  Proteins and compounds are cross-paired, producing one
 *                result per protein/compound combination. (e.g., docking)
 * - `together`:  All molecules are gathered into a single group and
 *                processed once collectively. (e.g., computing a bounding
 *                region around all molecules)
 */
export enum ProcessingMode {
    Separate = "separate",
    Pairwise = "pairwise",
    Together = "together",
}

export interface IMoleculeInputParams {
    molsToConsider?: IMolsToConsider;
    considerProteins?: boolean;
    considerCompounds?: boolean;
    considerAllMoleculeTypes?: boolean;
    processingMode?: ProcessingMode;
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

    /**
     * When true, all terminal molecule types (proteins, compounds, nucleic
     * acids, metals, solvent, ions, lipids, etc.) are gathered rather than
     * only proteins and compounds.
     */
    considerAllMoleculeTypes = false;

    /**
     * Controls how the gathered molecules are processed. When null, the
     * effective mode is inferred from considerProteins/considerCompounds
     * for backward compatibility.
     */
    processingMode: ProcessingMode | null = null;

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
        if (params.considerAllMoleculeTypes !== undefined) {
            this.considerAllMoleculeTypes = params.considerAllMoleculeTypes;
        }
        if (params.processingMode !== undefined) {
            this.processingMode = params.processingMode;
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
    }

    /**
     * The effective processing mode. When processingMode is not explicitly
     * set (null), infers the mode from the molecule type flags:
     *   - Both proteins and compounds considered => Pairwise
     *   - Otherwise => Separate
     * This preserves backward compatibility for existing plugins that never
     * set processingMode.
     *
     * @returns {ProcessingMode} The resolved processing mode.
     */
    public get effectiveProcessingMode(): ProcessingMode {
        if (this.processingMode !== null) {
            return this.processingMode;
        }
        // Infer from flags for backward compatibility
        if (this.considerProteins && this.considerCompounds && !this.considerAllMoleculeTypes) {
            return ProcessingMode.Pairwise;
        }
        return ProcessingMode.Separate;
    }


    /**
     * Main entry point: gathers molecules according to the current
     * configuration and returns them structured per the processingMode.
     *
     * @returns {Promise<IProtCmpdTreeNodePair[] | FileInfo[]>} Pairwise
     *     pairs, or a flat list of FileInfo objects (for separate/together).
     */
    public getProtAndCompoundPairs(): Promise<
        IProtCmpdTreeNodePair[] | FileInfo[]
    > {
        if (this.considerAllMoleculeTypes) {
            return this._gatherAllMoleculeTypes();
        }
        return this._gatherProteinAndCompoundTypes();
    }

    /**
     * Gathers only protein and compound types, then structures the result
     * according to the processing mode.
     *
     * @returns {Promise<IProtCmpdTreeNodePair[] | FileInfo[]>} The result.
     */
    private async _gatherProteinAndCompoundTypes(): Promise<
        IProtCmpdTreeNodePair[] | FileInfo[]
    > {
        const compiledMols = compileMolModels(this.molsToConsider, true);

        // Remove one or other, if required.
        if (!this.considerProteins) {
            compiledMols.nodeGroups = [];
        }

        if (!this.considerCompounds) {
            compiledMols.compoundsNodes = new TreeNodeList();
        }

        const protFileInfos = await this._convertProteinGroups(
            compiledMols.nodeGroups
        );
        const cmpdFileInfos = compiledMols.compoundsNodes
            ? await getConvertedTxts(
                compiledMols.compoundsNodes,
                this.compoundFormat,
                false
              )
            : [];

        const prots = protFileInfos.filter((p) => p !== undefined);
        const cmpds = cmpdFileInfos.filter((c) => c !== undefined);

        return this._structureResults(prots, cmpds);
    }

    /**
     * Gathers all molecule types (proteins, compounds, nucleic acids, metals,
     * solvent, ions, lipids, etc.) and structures the result according to the
     * processing mode.
     *
     * @returns {Promise<FileInfo[]>} A flat list of FileInfo objects.
     */
    private async _gatherAllMoleculeTypes(): Promise<FileInfo[]> {
        const compiledMols = compileMolModels(this.molsToConsider, true);

        if (!this.considerProteins) {
            compiledMols.nodeGroups = [];
        }
        if (!this.considerCompounds) {
            compiledMols.compoundsNodes = new TreeNodeList();
        }

        const allFileInfos: FileInfo[] = [];

        // Collect IDs of nodes already handled by compileMolModels so we
        // don't duplicate them when we sweep for "other" node types below.
        const handledIds = new Set<string>();

        // Proteins (with filtering for metals/solvent/nucleic)
        for (const prots of compiledMols.nodeGroups) {
            const filteredProts = this._applyProteinFilters(prots);

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

        // Compounds
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

        // Remaining terminal nodes of any type not already handled
        const remaining = this._gatherRemainingTerminals(handledIds);
        if (remaining.length > 0) {
            const otherFileInfos = await getConvertedTxts(
                remaining,
                "pdb",
                false
            );
            allFileInfos.push(
                ...otherFileInfos.filter((f) => f !== undefined)
            );
        }

        console.log(
            "[MoleculeInput] Included terminal nodes:",
            allFileInfos.map((fi) => fi.treeNode?.title ?? fi.name)
        );

        return allFileInfos;
    }

    /**
     * Converts protein node groups into FileInfo objects, applying the
     * metal/solvent/nucleic filters and merging each group into one file.
     *
     * @param {TreeNodeList[]} nodeGroups The protein node groups.
     * @returns {Promise<FileInfo[]>} One FileInfo per protein group.
     */
    private async _convertProteinGroups(
        nodeGroups: TreeNodeList[]
    ): Promise<FileInfo[]> {
        const promises = nodeGroups.map((prots: TreeNodeList) => {
            const filtered = this._applyProteinFilters(prots);
            return getConvertedTxts(filtered, this.proteinFormat, true).then(
                (fileInfos: FileInfo[]) => fileInfos[0]
            );
        });
        return Promise.all(promises);
    }

    /**
     * Applies the includeMetals/Solvent/Nucleic filters to a protein
     * TreeNodeList.
     *
     * @param {TreeNodeList} prots The unfiltered protein node list.
     * @returns {TreeNodeList} The filtered list.
     */
    private _applyProteinFilters(prots: TreeNodeList): TreeNodeList {
        let filtered = prots;
        if (!this.includeMetalsAsProtein) {
            filtered = filtered.filter(
                (p: TreeNode) =>
                    p.type !== TreeNodeType.Metal &&
                    p.type !== TreeNodeType.Ions
            );
        }
        if (!this.includeSolventAsProtein) {
            filtered = filtered.filter(
                (p: TreeNode) => p.type !== TreeNodeType.Solvent
            );
        }
        if (!this.includeNucleicAsProtein) {
            filtered = filtered.filter(
                (p: TreeNode) => p.type !== TreeNodeType.Nucleic
            );
        }
        return filtered;
    }

    /**
     * Finds terminal nodes matching the visibility/selection criteria that
     * were not already handled by compileMolModels.
     *
     * @param {Set<string>} handledIds IDs of nodes already processed.
     * @returns {TreeNodeList} The remaining unhandled terminal nodes.
     */
    private _gatherRemainingTerminals(handledIds: Set<string>): TreeNodeList {
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

        return candidates.filters.onlyTerminal.filter(
            (node: TreeNode) => {
                if (!node.id || handledIds.has(node.id)) return false;
                if (!node.model) return false;
                return true;
            }
        );
    }

    /**
     * Structures the gathered protein and compound FileInfos according to
     * the current processingMode.
     *
     * @param {FileInfo[]} prots  The protein FileInfos.
     * @param {FileInfo[]} cmpds  The compound FileInfos.
     * @returns {IProtCmpdTreeNodePair[] | FileInfo[]} Structured results.
     */
    private _structureResults(
        prots: FileInfo[],
        cmpds: FileInfo[]
    ): IProtCmpdTreeNodePair[] | FileInfo[] {
        switch (this.effectiveProcessingMode) {
            case ProcessingMode.Pairwise:
                return this._buildPairwiseResults(prots, cmpds);

            case ProcessingMode.Together:
            case ProcessingMode.Separate:
            default:
                // Both together and separate return a flat list; the
                // distinction is in how the caller interprets the result
                // (one collective run vs. one run per item).
                if (prots.length > 0 && cmpds.length > 0) {
                    return [...prots, ...cmpds];
                }
                return cmpds.length > 0 ? cmpds : prots;
        }
    }

    /**
     * Builds pairwise protein/compound combinations.
     *
     * @param {FileInfo[]} prots  The protein FileInfos.
     * @param {FileInfo[]} cmpds  The compound FileInfos.
     * @returns {IProtCmpdTreeNodePair[] | FileInfo[]} Pairs if both exist,
     *     otherwise whichever list is non-empty.
     */
    private _buildPairwiseResults(
        prots: FileInfo[],
        cmpds: FileInfo[]
    ): IProtCmpdTreeNodePair[] | FileInfo[] {
        if (prots.length > 0 && cmpds.length > 0) {
            const pairs: IProtCmpdTreeNodePair[] = [];
            for (const prot of prots) {
                for (const cmpd of cmpds) {
                    pairs.push({ prot, cmpd });
                }
            }
            return pairs;
        }
        return cmpds.length > 0 ? cmpds : prots;
    }
}