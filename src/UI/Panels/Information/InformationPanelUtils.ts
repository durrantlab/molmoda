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

/**
 * Extracts an ordered sequence of residues from a TreeNode model.
 *
 * @param {IAtom[] | IFileInfo | GLModel | undefined} model The molecular model from a TreeNode.
 * @returns {Promise<ResidueInfo[]>} A promise that resolves to an array of ResidueInfo objects.
 */
export async function getOrderedResidueSequenceFromModel(
    model: IAtom[] | IFileInfo | GLModel | undefined
): Promise<ResidueInfo[]> {
    if (!model) {
        return [];
    }

    const parser: EasyParserParent = makeEasyParser(model);
    const atoms: IAtom[] = parser.atoms; // This getter ensures all atoms are parsed

    if (!atoms || atoms.length === 0) {
        return [];
    }

    const sequence: ResidueInfo[] = [];
    const visitedResidues = new Set<string>(); // To track chain:resi combinations

    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        // Ensure atom properties used for key are defined
        const chain = atom.chain ?? "A"; // Default chain if undefined
        const resi = atom.resi ?? 0; // Default resi if undefined
        const resn = atom.resn ?? "UNK"; // Default resn if undefined

        const residueKey = `${chain}:${resi}`;
        if (!visitedResidues.has(residueKey)) {
            sequence.push({
                oneLetterCode: threeLetterToPdbOneLetter(resn),
                threeLetterCode: resn,
                resi: resi,
                chain: chain,
                atomIndex: i, // Store the index of the first atom encountered for this residue
            });
            visitedResidues.add(residueKey);
        }
    }
    return sequence;
}
