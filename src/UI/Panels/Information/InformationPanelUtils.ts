import { FileInfo } from "@/FileSystem/FileInfo";
import { IAtom, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { EasyParserParent } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser/EasyParserParent";
import { GLModel } from "../Viewer/GLModelType";
import { IFileInfo } from "@/FileSystem/Types";
import { threeLetterToPdbOneLetter } from "@/Core/Bioinformatics/AminoAcidUtils";

/**
 * Represents information about a single residue in a protein sequence.
 */
export interface ResidueInfo {
    oneLetterCode: string;
    threeLetterCode: string;
    resi: number;
    chain: string;
    atomIndex?: number; // Optional: 0-based index of the first atom of this residue in the full atom list
}

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

