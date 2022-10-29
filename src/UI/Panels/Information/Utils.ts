import { convertMolContainers } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/ConvertMolContainer";
import {
    IMolContainer,
    MolType,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

/**
 * Get the SMILES string of the currently selected molecule.
 *
 * @param  {IMolContainer[]} molecules  The molecules.
 * @returns {Promise<string>}  A promise that resolves to the SMILES string.
 */
export function getSmilesOfSelected(
    molecules: IMolContainer[]
): Promise<string> {
    // Get any terminal node that is selected and a compound
    const terminalNodes = getTerminalNodes(molecules);
    const selectedTerminalNodes = terminalNodes.filter(
        (node) =>
            node.selected === SelectedType.True &&
            node.type === MolType.Compound
    );
    if (selectedTerminalNodes.length > 0) {
        // Just consider the first one
        const terminalNode = selectedTerminalNodes[0];

        // Get it as a smiles string
        return convertMolContainers([terminalNode], "can", false)
            .then((cans: string[]) => {
                return cans[0].trim();
            })
            .catch((error) => {
                console.error(error);
                return "";
            });
    }
    return Promise.resolve("");
}
