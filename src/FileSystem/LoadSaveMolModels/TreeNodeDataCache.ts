import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    ITreeNodeData,
    TableHeaderSort,
    TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
/**
 * Dataset title under treeNode.data where molecule-identity values (currently
 * SMILES and PubChem CID) live. Surfaced in the user-facing Data panel and
 * also used as a cache so repeated lookups of the same node skip redundant
 * work. Mirrors the convention used by the other PubChem dataset titles
 * ("Properties", "Names").
 */
export const IDENTITY_DATASET_TITLE = "Identity";
/** Options controlling how a cached field is read back. */
export interface IReadFieldOptions {
    /**
     * Remove HTML tags before returning the value. Some writers store display
     * markup in the cell (e.g. the PubChem CID is wrapped in an anchor), so a
     * caller that wants the bare value sets this. Only tags are removed;
     * callers still validate the stripped text if a specific shape is required.
     */
    stripHtml?: boolean;
}
/**
 * Strips HTML tags from a string. Intended for the lightweight markup this
 * cache stores (anchors), not general sanitisation, so entities are left
 * untouched.
 *
 * @param {string} html  The string possibly containing tags.
 * @returns {string}  The string with tags removed.
 */
export function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, "");
}
/**
 * Reads a single field from a tree node's named data table, treating that
 * table as a cache. Returns null when the table or field is absent, the stored
 * value is not a string, or the (optionally HTML-stripped) value is empty, so
 * every caller can treat null uniformly as a cache miss.
 *
 * @param {TreeNode | undefined} treeNode      The node to read from.
 * @param {string}               datasetTitle  The data table title.
 * @param {string}               field         The field within that table.
 * @param {IReadFieldOptions}    [options]     Read options (e.g. stripHtml).
 * @returns {string | null}  The cached value, or null on a miss.
 */
export function getDataTableField(
    treeNode: TreeNode | undefined,
    datasetTitle: string,
    field: string,
    options: IReadFieldOptions = {}
): string | null {
    if (!treeNode || !treeNode.data) {
        return null;
    }
    const entry = treeNode.data[datasetTitle];
    const data = entry?.data as { [key: string]: unknown } | undefined;
    const raw = data?.[field];
    if (typeof raw !== "string") {
        return null;
    }
    const value = options.stripHtml ? stripHtmlTags(raw) : raw;
    return value.trim().length > 0 ? value : null;
}
/**
 * Merges arbitrary fields into a tree node's named data table, creating the
 * data container as needed. Reads any existing table entry and spreads it back
 * in so values written by other code paths coexist with the new fields rather
 * than being clobbered. This is the single read-merge-write path shared by
 * every data-table cache writer.
 *
 * @param {TreeNode | undefined}       treeNode      The node to write to.
 * @param {string}                     datasetTitle  The data table title.
 * @param {{ [key: string]: unknown }} fields        The fields to merge in.
 */
export function mergeIntoDataTable(
    treeNode: TreeNode | undefined,
    datasetTitle: string,
    fields: { [key: string]: unknown }
): void {
    if (!treeNode) {
        return;
    }
    if (!treeNode.data) {
        treeNode.data = {};
    }
    const existing = treeNode.data[datasetTitle];
    const existingData =
        existing && existing.type === TreeNodeDataType.Table && existing.data
            ? (existing.data as { [key: string]: unknown })
            : {};
    treeNode.data[datasetTitle] = {
        data: { ...existingData, ...fields },
        type: TreeNodeDataType.Table,
        treeNodeId: treeNode.id,
        headerSort: TableHeaderSort.None,
    } as ITreeNodeData;
}
/**
 * Writes a single field into a tree node's named data table. Empty values are
 * skipped, since a blank cache entry is meaningless and would read back as a
 * miss anyway. Delegates to mergeIntoDataTable so the read-merge-write logic
 * lives in one place.
 *
 * @param {TreeNode | undefined} treeNode      The node to write to.
 * @param {string}               datasetTitle  The data table title.
 * @param {string}               field         The field within that table.
 * @param {string}               value         The value to store.
 */
export function setDataTableField(
    treeNode: TreeNode | undefined,
    datasetTitle: string,
    field: string,
    value: string
): void {
    if (!treeNode || !value) {
        return;
    }
    mergeIntoDataTable(treeNode, datasetTitle, { [field]: value });
}