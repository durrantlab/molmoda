import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    ITreeNodeData,
    TableHeaderSort,
    TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * Dataset title under treeNode.data where the PubChem CID lives. Single
 * source of truth for a molecule's PubChem CID: every read goes through
 * getPubChemCidFromTreeNode (which reads from here) and every write
 * goes through setPubChemCidOnTreeNode or setPubChemNotFoundOnTreeNode
 * (which write here). Matches the convention used by other PubChem
 * dataset titles like "Properties" and "Names".
 */
export const PUBCHEM_DATASET_TITLE = "PubChem";

/**
 * Builds the HTML anchor used wherever a CID is displayed.
 *
 * @param {string} cid  Numeric PubChem CID.
 * @returns {string}  Anchor pointing to the PubChem compound page.
 */
export function buildCidLink(cid: string): string {
    return `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}" target="_blank">${cid}</a>`;
}

/**
 * Builds the "not found" HTML shown when a SMILES has no PubChem match.
 *
 * @param {string} smiles  The SMILES that failed to resolve.
 * @returns {string}  HTML pointing the user at a PubChem search.
 */
export function buildCidNotFoundHtml(smiles: string): string {
    const encoded = encodeURIComponent(smiles);
    return `PubChem compound not found! <a href="https://pubchem.ncbi.nlm.nih.gov/#query=${encoded}" target="_blank">Search PubChem</a>`;
}

/**
 * Extracts the numeric CID from the value stored in the "PubChem" data
 * cell. The cell normally holds an anchor of the form
 *   <a href=".../compound/2244" ...>2244</a>
 * so the CID is recovered by matching the path. A bare integer is also
 * accepted for forward compatibility. The not-found HTML deliberately
 * doesn't match either pattern, so it reads back as null.
 *
 * @param {any} cidField  Raw value from the data cell.
 * @returns {string | null}  CID string, or null when not parseable.
 */
function parseCidFromField(cidField: any): string | null {
    if (cidField === undefined || cidField === null) {
        return null;
    }
    const asString = String(cidField);
    const linkMatch = asString.match(/\/compound\/(\d+)/);
    if (linkMatch) {
        return linkMatch[1];
    }
    const bareMatch = asString.match(/^\s*(\d+)\s*$/);
    if (bareMatch) {
        return bareMatch[1];
    }
    return null;
}

/**
 * Helper that writes the PubChem entry on a tree node, creating the
 * data container as needed. Kept private so the only writers are the
 * two public setters below (one for the success path, one for not-found).
 *
 * @param {TreeNode} treeNode  The node to write to.
 * @param {string}   cidCell   The HTML to put in the CID cell.
 */
function writePubChemEntry(treeNode: TreeNode, cidCell: string): void {
    if (!treeNode.data) {
        treeNode.data = {};
    }
    treeNode.data[PUBCHEM_DATASET_TITLE] = {
        data: { CID: cidCell },
        type: TreeNodeDataType.Table,
        treeNodeId: treeNode.id,
        headerSort: TableHeaderSort.None,
    } as ITreeNodeData;
}

/**
 * Records a PubChem CID on a tree node. The only function that writes
 * a successful CID into the canonical location; importers, search
 * plugins, and the property-plugin lookup path all funnel through here.
 * No-op when a CID is already recorded so repeat lookups don't clobber
 * the existing entry.
 *
 * @param {TreeNode | undefined} treeNode  The tree node to stamp.
 * @param {string}               cid       The CID to associate.
 */
export function setPubChemCidOnTreeNode(
    treeNode: TreeNode | undefined,
    cid: string
): void {
    if (!treeNode || !cid) {
        return;
    }
    if (getPubChemCidFromTreeNode(treeNode) !== null) {
        return;
    }
    writePubChemEntry(treeNode, buildCidLink(cid));
}

/**
 * Records the not-found state on a tree node so the user sees a message
 * under the PubChem section instead of nothing. Does not overwrite a
 * previously recorded successful CID. The cell stores the search link
 * itself, which parseCidFromField intentionally fails to recognise,
 * so subsequent reads through getPubChemCidFromTreeNode return null
 * (i.e. the cache miss propagates correctly even though something is
 * visibly displayed for the user).
 *
 * @param {TreeNode | undefined} treeNode  The node to mark.
 * @param {string}               smiles    SMILES that failed to resolve.
 */
export function setPubChemNotFoundOnTreeNode(
    treeNode: TreeNode | undefined,
    smiles: string
): void {
    if (!treeNode) {
        return;
    }
    if (getPubChemCidFromTreeNode(treeNode) !== null) {
        return;
    }
    writePubChemEntry(treeNode, buildCidNotFoundHtml(smiles));
}

/**
 * Reads the CID off a tree node. The only function that reads the
 * canonical CID location. Returns null both for nodes with no PubChem
 * entry and for nodes whose entry is the "not found" placeholder, so
 * callers can use a single null-check to decide whether a network
 * lookup is still required.
 *
 * @param {TreeNode | undefined} treeNode  The tree node to read from.
 * @returns {string | null}  CID string, or null if unknown.
 */
export function getPubChemCidFromTreeNode(
    treeNode: TreeNode | undefined
): string | null {
    if (!treeNode || !treeNode.data) {
        return null;
    }
    const entry = treeNode.data[PUBCHEM_DATASET_TITLE];
    return parseCidFromField(entry?.data?.CID);
}