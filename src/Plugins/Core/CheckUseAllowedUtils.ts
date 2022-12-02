import { getStoreVar } from "@/Store/StoreExternalAccess";
import { selectInstructionsLong } from "@/UI/Navigation/TitleBar/MolSelecting";
import {
    IMolContainer,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";

/**
 * Checks whether the user has selected any molecule.
 *
 * @param  {IMolContainer[]} [molContainers]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolSelected(
    molContainers?: IMolContainer[],
    noun = "molecule"
): string | null {
    const num = numSelected(molContainers);
    if (num === 0) {
        return `No ${noun}s are currently selected. First select a ${noun} by clicking on its name in the Molecules panel.`;
    }

    return null;
}

/**
 * Checks whether the user has selected one and only one molecule.
 *
 * @param  {IMolContainer[]} [molContainers]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkOneMolSelected(
    molContainers?: IMolContainer[]
): string | null {
    const num = numSelected(molContainers);
    if (num !== 1) {
        return "First select one (and only one) molecule by clicking on its name in the Molecules panel.";
    }

    return null;
}

/**
 * Checks whether the user has selected multiple molecules (> 1).
 *
 * @param  {IMolContainer[]} [molContainers]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {string | null}  An error if the user hasn't selected multiple
 *     molecules, null otherwise.
 */
export function checkMultipleMolsSelected(
    molContainers?: IMolContainer[]
): string | null {
    const num = numSelected(molContainers);
    if (num < 2) {
        return `First select at least two molecules by clicking on their names in the Molecules panel. ${selectInstructionsLong}`;
        // Click while holding down the Control, Command (Mac), and/or Shift keys to select multiple molecules.";
    }

    return null;
}

/**
 * Gets the number of molecules selected.
 *
 * @param  {IMolContainer[]} [molContainers]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {number}  The number of molecules selected.
 */
function numSelected(molContainers?: IMolContainer[]): number {
    if (molContainers === undefined) {
        molContainers = getStoreVar("molecules");
    }

    // Check if user has selected anything
    const selectedNodes = getAllNodesFlattened(
        molContainers as IMolContainer[]
    ).filter((n) => n.selected === SelectedType.True);
    return selectedNodes.length;
}

/**
 * Checks whether the user has loaded any molecule.
 *
 * @param  {IMolContainer[]} [molContainers]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolLoaded(
    molContainers?: IMolContainer[]
): string | null {
    if (molContainers === undefined) {
        molContainers = getStoreVar("molecules");
    }

    if ((molContainers as IMolContainer[]).length === 0) {
        return "Nothing to save or export (empty project). Try adding molecules first.";
    }

    return null;
}
