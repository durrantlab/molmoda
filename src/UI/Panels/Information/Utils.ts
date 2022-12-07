import { convertMolContainers } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/ConvertMolContainer";
import { FileInfo } from "@/FileSystem/FileInfo";
import {
    IMolContainer,
    MolType,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

/**
 * Gets the first of all the selected molecules.
 *
 * @param  {IMolContainer[]} molecules  The molecules to consider.
 * @returns {IMolContainer | null}  The first selected molecule, or null if none
 *    are selected.
 */
export function getFirstSelected(
    molecules: IMolContainer[]
): IMolContainer | null {
    // Get any terminal node that is selected and a compound
    const terminalNodes = getTerminalNodes(molecules);
    const selectedTerminalNodes = terminalNodes.filter(
        (node) =>
            node.selected === SelectedType.True &&
            node.type === MolType.Compound
    );
    if (selectedTerminalNodes.length === 0) {
        return null;
    }
    return selectedTerminalNodes[0];
}

/**
 * Get the SMILES string of the provided IMolContainer.
 *
 * @param  {IMolContainer} molContainer  The IMolContainer.
 * @returns {Promise<string>}  A promise that resolves to the SMILES string.
 */
export function getSmilesOfMolContainer(
    molContainer: IMolContainer
): Promise<string> {
    // Get it as a smiles string
    return convertMolContainers([molContainer], "can", false)
        .then((fileInfos: FileInfo[]) => {
            return fileInfos[0].contents.trim();
        })
        .catch((error) => {
            console.error(error);
            return "";
        });
}
