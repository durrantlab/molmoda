import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getFormatInfoGivenType } from "./Types/MolFormats";
import {
    IDENTITY_DATASET_TITLE,
    getDataTableField,
    setDataTableField,
} from "./TreeNodeDataCache";
// Re-exported so existing importers of the Identity title from this module
// keep working now that the canonical definition lives in TreeNodeDataCache.
export { IDENTITY_DATASET_TITLE };
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
 * exists or the stored value is empty, so callers can treat null as
 * "conversion still required".
 *
 * @param {TreeNode | undefined} treeNode  The node to read from.
 * @returns {string | null}  The cached SMILES, or null.
 */
export function getSmilesFromTreeNode(
    treeNode: TreeNode | undefined
): string | null {
    return getDataTableField(treeNode, IDENTITY_DATASET_TITLE, SMILES_FIELD);
    }
/**
 * Records a SMILES on a tree node under the Identity table. Empty strings are
 * dropped by setDataTableField, so a blank SMILES (a meaningless cache entry
 * that would later read back as a hit) is never written.
 *
 * @param {TreeNode | undefined} treeNode  The node to write to.
 * @param {string}               smiles    The SMILES to store.
 */
export function setSmilesOnTreeNode(
    treeNode: TreeNode | undefined,
    smiles: string
): void {
    setDataTableField(treeNode, IDENTITY_DATASET_TITLE, SMILES_FIELD, smiles);
}