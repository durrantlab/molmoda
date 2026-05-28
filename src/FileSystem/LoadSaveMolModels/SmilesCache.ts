import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    ITreeNodeData,
    TableHeaderSort,
    TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getFormatInfoGivenType } from "./Types/MolFormats";

/**
 * Dataset title under treeNode.data where molecule-identity values (currently
 * just the SMILES string) live. Surfaced in the user-facing Data panel and
 * also used as a cache so repeated SMILES conversions of the same node skip a
 * redundant OpenBabel round-trip. Mirrors the convention used by the PubChem
 * dataset titles ("PubChem", "Properties", "Names").
 */
export const IDENTITY_DATASET_TITLE = "Identity";

/** Field name within the Identity table that holds the SMILES string. */
export const SMILES_FIELD = "SMILES";

/**
 * Whether a target extension/format denotes SMILES. Both the line-oriented
 * "smi" and the canonical "can" formats are treated as SMILES, since a single
 * cache entry serves either: both are valid SMILES and the downstream
 * consumers (copy, PubChem lookup, display) don't depend on canonicalization.
 *
 * @param {string} targetExt  The extension or format name.
 * @returns {boolean}  True if the format is a SMILES format.
 */
export function isSmilesFormat(targetExt: string): boolean {
    const info = getFormatInfoGivenType(targetExt);
    const ext = info ? info.primaryExt : targetExt.toLowerCase();
    return ext === "smi" || ext === "can";
}

/**
 * Extracts the bare SMILES from OpenBabel SMILES output, which is formatted as
 * "SMILES<whitespace>title". A SMILES string never contains whitespace, so the
 * first token is the structure.
 *
 * @param {string} contents  The raw SMILES file contents.
 * @returns {string}  The SMILES string (may be empty if contents are blank).
 */
export function extractSmilesFromContents(contents: string): string {
    return contents.trim().split(/\s+/)[0] ?? "";
}

/**
 * Reads a cached SMILES off a tree node. Returns null when no Identity entry
 * exists or the stored value is empty, so callers can treat null as "conversion
 * still required".
 *
 * @param {TreeNode | undefined} treeNode  The node to read from.
 * @returns {string | null}  The cached SMILES, or null.
 */
export function getSmilesFromTreeNode(
    treeNode: TreeNode | undefined
): string | null {
    if (!treeNode || !treeNode.data) {
        return null;
    }
    const entry = treeNode.data[IDENTITY_DATASET_TITLE];
    const data = entry?.data as { [key: string]: unknown } | undefined;
    const smiles = data?.[SMILES_FIELD];
    if (typeof smiles === "string" && smiles.trim().length > 0) {
        return smiles;
    }
    return null;
}

/**
 * Records a SMILES on a tree node under the Identity table. Delegates to
 * mergeIntoIdentityTable so the read-merge-write logic lives in one place;
 * the extra empty-string guard is kept here so a blank SMILES is never
 * written (a meaningless cache entry that would later read back as a hit).
 *
 * @param {TreeNode | undefined} treeNode  The node to write to.
 * @param {string}               smiles    The SMILES to store.
 */
export function setSmilesOnTreeNode(
    treeNode: TreeNode | undefined,
    smiles: string
): void {
    if (!treeNode || !smiles) {
        return;
    }
    mergeIntoIdentityTable(treeNode, { [SMILES_FIELD]: smiles });
}

/**
 * Merges arbitrary fields into a tree node's Identity table, creating the
 * data container as needed. Reads any existing Identity entry and spreads it
 * back in so values written by other code paths (SMILES, PubChem CID) coexist
 * with the new fields rather than being clobbered. This is the shared writer
 * for callers that need to add identity-level data beyond SMILES/CID.
 *
 * @param {TreeNode | undefined}       treeNode  The node to write to.
 * @param {{ [key: string]: unknown }} fields    The fields to merge in.
 */
export function mergeIntoIdentityTable(
    treeNode: TreeNode | undefined,
    fields: { [key: string]: unknown }
): void {
    if (!treeNode) {
        return;
    }
    if (!treeNode.data) {
        treeNode.data = {};
    }
    const existing = treeNode.data[IDENTITY_DATASET_TITLE];
    const existingData =
        existing && existing.type === TreeNodeDataType.Table && existing.data
            ? (existing.data as { [key: string]: unknown })
            : {};
    treeNode.data[IDENTITY_DATASET_TITLE] = {
        data: { ...existingData, ...fields },
        type: TreeNodeDataType.Table,
        treeNodeId: treeNode.id,
        headerSort: TableHeaderSort.None,
    } as ITreeNodeData;
}