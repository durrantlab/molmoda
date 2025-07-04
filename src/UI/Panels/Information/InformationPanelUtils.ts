import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";


/**
 * Gets the first of all the selected molecules.
 *
 * @param  {TreeNodeList} molecules  The molecules to consider.
 * @returns {TreeNode | null}  The first selected molecule, or null if none
 * are selected.
 */
export function getFirstSelected(molecules: TreeNodeList): TreeNode | null {
    // Get any terminal node that is selected
    const terminalNodes = molecules.filters.onlyTerminal;
    const selectedTerminalNodes = terminalNodes.filters.keepSelected();

    if (selectedTerminalNodes.length === 0) {
        return null;
    }
    // Prioritize protein or compound if multiple types are selected
    const proteinOrCompound = selectedTerminalNodes.find(
        (node) =>
            node.type === TreeNodeType.Protein ||
            node.type === TreeNodeType.Compound
    );

    return proteinOrCompound || selectedTerminalNodes.get(0);
}

/**
 * Get the SMILES string of the provided TreeNode.
 *
 * @param  {TreeNode} treeNode  The TreeNode.
 * @returns {Promise<string>}  A promise that resolves to the SMILES string.
 */
export function getSmilesOfTreeNode(treeNode: TreeNode): Promise<string> {
    // Get it as a smiles string
    return treeNode
        .toFileInfo("can")
        .then((fileInfo: FileInfo) => {
            return fileInfo.contents.trim();
        })
        .catch((error) => {
            throw error;
        });
}

