import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    IDENTITY_DATASET_TITLE,
    getDataTableField,
    mergeIntoDataTable,
} from "@/FileSystem/LoadSaveMolModels/TreeNodeDataCache";
/**
 * Field name within the Identity table that holds the PubChem CID. The CID
 * shares the Identity table with the SMILES (see SmilesCache) so a molecule's
 * identity values live in one place. Every read goes through
 * getPubChemCidFromTreeNode and every write through setPubChemCidOnTreeNode or
 * setPubChemNotFoundOnTreeNode, keeping this the single source of truth.
 */
export const PUBCHEM_CID_FIELD = "PubChem CID";
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
 * Helper that writes the PubChem CID cell into the Identity table. Delegates to
 * the shared mergeIntoDataTable writer so the CID coexists with any SMILES
 * already recorded there. Kept private so the only writers are the two public
 * setters below (one for the success path, one for not-found).
 *
 * @param {TreeNode} treeNode  The node to write to.
 * @param {string}   cidCell   The HTML to put in the CID cell.
 */
function writePubChemEntry(treeNode: TreeNode, cidCell: string): void {
    mergeIntoDataTable(treeNode, IDENTITY_DATASET_TITLE, {
        [PUBCHEM_CID_FIELD]: cidCell,
    });
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
 * instead of nothing. Does not overwrite a previously recorded successful
 * CID. The cell stores the search link, whose stripped text is non-numeric, so
 * subsequent reads through getPubChemCidFromTreeNode return null (i.e. the
 * cache miss propagates correctly even though something is visibly displayed
 * for the user).
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
 * Reads the CID off a tree node. The only function that reads the canonical
 * CID location. The cell stores a display anchor (<a ...>2244</a>); stripping
 * the markup yields the bare CID. Returns null both for nodes with no PubChem
 * entry and for nodes whose entry is the "not found" placeholder (its stripped
 * text is non-numeric and so fails the digit check), so callers can use a
 * single null-check to decide whether a network lookup is still required.
 *
 * @param {TreeNode | undefined} treeNode  The tree node to read from.
 * @returns {string | null}  CID string, or null if unknown.
 */
export function getPubChemCidFromTreeNode(
    treeNode: TreeNode | undefined
): string | null {
    const text = getDataTableField(
        treeNode,
        IDENTITY_DATASET_TITLE,
        PUBCHEM_CID_FIELD,
        { stripHtml: true }
    );
    if (text === null) {
        return null;
    }
    const cid = text.trim();
    return /^\d+$/.test(cid) ? cid : null;
}