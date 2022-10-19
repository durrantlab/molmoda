import { getStoreVar } from "@/Store/StoreExternalAccess";
import {
    IMolContainer,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { MolsToUse } from "./Definitions";

/**
 * Whether a given molsToUse variable includes visible molecules. (Basically,
 * whether it is MolsToUse.Visible or MolsToUse.VisibleOrSelected.)
 *
 * @param  {MolsToUse} molsToUse  The molsToUse variable to check.
 * @returns {boolean}  Whether the molsToUse variable includes visible
 *     molecules.
 */
function molsToUseIncludesVisible(molsToUse: MolsToUse): boolean {
    return (
        [MolsToUse.Visible, MolsToUse.VisibleOrSelected].indexOf(molsToUse) !==
        -1
    );
}

/**
 * Whether a given molsToUse variable includes selected molecules. (Basically,
 * whether it is MolsToUse.Selected or MolsToUse.VisibleOrSelected.)
 *
 * @param  {MolsToUse} molsToUse  The molsToUse variable to check.
 * @returns {boolean}  Whether the molsToUse variable includes selected
 *     molecules.
 */
function molsToUseIncludesSelected(molsToUse: MolsToUse): boolean {
    return (
        [MolsToUse.Selected, MolsToUse.VisibleOrSelected].indexOf(molsToUse) !==
        -1
    );
}

/**
 * Whether a given molecule is selected. It can be directly selected, or the
 * child of a selected molecule.
 *
 * @param  {IMolContainer} mol  The molecule to check.
 * @returns {boolean}  Whether the molecule is selected.
 */
function isMolSelected(mol: IMolContainer): boolean {
    return (
        [SelectedType.ChildOfTrue, SelectedType.True].indexOf(mol.selected) !==
        -1
    );
}

/**
 * Given a molsToUse variable, gets the molecules to consider.
 *
 * @param  {MolsToUse}        molsToUse        The molsToUse variable.
 * @param  {IMolContainer[]}  [terminalNodes]  The list of molecules to
 *                                             consider. If undefined, gets all
 *                                             molecules from VueX store.
 * @returns {IMolContainer[]}  The molecules to consider.
 */
export function getTerminalNodesToUse(
    molsToUse: MolsToUse,
    terminalNodes?: IMolContainer[]
): IMolContainer[] {
    if (terminalNodes === undefined) {
        terminalNodes = getTerminalNodes(getStoreVar("molecules"));
    }

    if (molsToUse === MolsToUse.All) {
        return terminalNodes;
    }

    return terminalNodes.filter((mol) => {
        if (mol.visible === true && molsToUseIncludesVisible(molsToUse)) {
            return true;
        }
        return isMolSelected(mol) && molsToUseIncludesSelected(molsToUse);
    });
}
