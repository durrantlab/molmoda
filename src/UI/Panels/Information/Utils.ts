import { FileInfo } from "@/FileSystem/FileInfo";
import { MolType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * Gets the first of all the selected molecules.
 *
 * @param  {TreeNodeList} molecules  The molecules to consider.
 * @returns {TreeNode | null}  The first selected molecule, or null if none
 *    are selected.
 */
export function getFirstSelected(molecules: TreeNodeList): TreeNode | null {
    // Get any terminal node that is selected and a compound
    const terminalNodes = molecules.filters.onlyTerminal;
    let selectedTerminalNodes = terminalNodes.filters.keepSelected();
    selectedTerminalNodes = selectedTerminalNodes.filters.keepType(
        MolType.Compound
    );
    if (selectedTerminalNodes.length === 0) {
        return null;
    }
    return selectedTerminalNodes.get(0);
}

/**
 * Get the SMILES string of the provided TreeNode.
 *
 * @param  {TreeNode} treeNode  The TreeNode.
 * @returns {Promise<string>}  A promise that resolves to the SMILES string.
 */
export function getSmilesOfTreeNode(
    treeNode: TreeNode
): Promise<string> {
    // Get it as a smiles string
    return treeNode.toFileInfo("can")
        .then((fileInfo: FileInfo) => {
            return fileInfo.contents.trim();
        })
        .catch((error) => {
            throw error;
        });
}
