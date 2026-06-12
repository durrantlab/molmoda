import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNodeType, IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import type { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import type { IFileInfo } from "@/FileSystem/Types";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import type { IResidueId } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser/EasyParserParent";
import { toRaw } from "vue";

/** Cutoff (Angstroms) defining a residue as part of the binding pocket. */
export const BINDING_POCKET_DISTANCE = 5;

/** Pocket residues grouped by chain, so selections stay chain-precise. */
export interface IPerChainResidues {
    [chain: string]: number[];
}

/** Maps a protein terminal-node id to its pocket residues. */
export type PocketSelectionsByNodeId = {
    [nodeId: string]: IPerChainResidues;
};

type ParserSource = IFileInfo | GLModel | IAtom[];

interface IVisibleProteinsAndCompounds {
    proteins: TreeNode[];
    compounds: TreeNode[];
}

/**
 * Collect visible protein and compound terminal nodes that carry a model.
 * Pockets are defined across the whole project, so nodes are not grouped by
 * parent structure.
 */
function _visibleProteinsAndCompounds(
    allMols: TreeNodeList
): IVisibleProteinsAndCompounds {
    const proteins: TreeNode[] = [];
    const compounds: TreeNode[] = [];
    allMols.filters.onlyTerminal.forEach((node: TreeNode) => {
        if (!node.model || !node.visible) {
            return;
        }
        if (node.type === TreeNodeType.Protein) {
            proteins.push(node);
        } else if (node.type === TreeNodeType.Compound) {
            compounds.push(node);
        }
    });
    return { proteins, compounds };
}

/**
 * Group a flat residue list by chain for chain-precise selections.
 *
 * @param {IResidueId[]} residues Flat list of residue identifiers.
 * @returns {IPerChainResidues} Residues grouped by chain id.
 */
function _residuesToPerChain(residues: IResidueId[]): IPerChainResidues {
    const perChain: IPerChainResidues = {};
    for (const residue of residues) {
        if (!perChain[residue.chain]) {
            perChain[residue.chain] = [];
        }
        perChain[residue.chain].push(residue.resi);
    }
    return perChain;
}

/**
 * Compute binding-pocket residues for every visible protein in the project.
 *
 * First pass: aggregate the atoms of all visible compounds into one set. Second
 * pass: test each visible protein against that set. Compounds and proteins are
 * compared across the whole project, regardless of which structure they
 * belong to.
 *
 * Optimizations: the compound set is aggregated and gridded once, then reused
 * for every protein; each protein atom only tests the grid cells around it
 * (atoms far from all compounds hit empty cells and exit cheaply); and a
 * residue is dropped from further testing as soon as it qualifies.
 *
 * @param distance Cutoff in Angstroms.
 * @returns Pocket residues keyed by protein node id (empty pockets omitted).
 */
export function computeBindingPocketSelections(
    distance: number = BINDING_POCKET_DISTANCE
): PocketSelectionsByNodeId {
    const { proteins, compounds } = _visibleProteinsAndCompounds(
        getMoleculesFromStore()
    );
    const result: PocketSelectionsByNodeId = {};
    if (proteins.length === 0 || compounds.length === 0) {
        return result;
    }

    // First pass: one combined parser holding every visible compound atom.
    const compoundParser = makeEasyParser([]);
    for (const node of compounds) {
        const parser = makeEasyParser(toRaw(node.model) as ParserSource);
        compoundParser.appendAtoms(parser.atoms);
    }
        if (compoundParser.length === 0) {
        return result;
        }

    // Grid the compound atoms once; reused for every protein below.
    const compoundGrid = compoundParser.buildProximityGrid(distance);

    // Second pass: residues of each protein near any compound.
    for (const proteinNode of proteins) {
            const proteinParser = makeEasyParser(
                toRaw(proteinNode.model) as ParserSource
            );
        const residues = proteinParser.residuesNearGrid(compoundGrid);
            if (residues.length === 0) {
                continue;
            }
            result[proteinNode.id as string] = _residuesToPerChain(residues);
        }

    return result;
}

/**
 * Build a 3Dmol atom selection from pocket residues. Chains are combined with
 * `or` so each chain keeps its own residue list (avoiding a chain x resi
 * cross-product that would select unrelated residues).
 *
 * @param {IPerChainResidues} perChain Residues keyed by chain id.
 * @returns {Record<string, unknown>} A 3Dmol-compatible atom-selection object.
 */
export function perChainToSelection(
    perChain: IPerChainResidues
): Record<string, unknown> {
    const clauses = Object.keys(perChain)
        .filter((chain) => perChain[chain].length > 0)
        .map((chain) => ({ chain, resi: perChain[chain] }));
    if (clauses.length === 1) {
        return clauses[0];
    }
    return { or: clauses };
}

/**
 * A cheap signature of the inputs affecting pocket geometry: the ids of the
 * visible protein and compound terminal nodes. Coordinates are static once
 * loaded, so this set detects when a recompute is needed and avoids
 * recomputing on pure style changes. Visibility is included so toggling a
 * protein or compound triggers a refresh.
 */
export function bindingPocketSignature(): string {
    const { proteins, compounds } = _visibleProteinsAndCompounds(
        getMoleculesFromStore()
    );
    const ids = [...proteins, ...compounds].map((n) => n.id as string);
    ids.sort();
    return ids.join("|");
}