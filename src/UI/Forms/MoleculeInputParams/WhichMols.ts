import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";

// /**
//  * Whether a given molsToUse variable includes visible molecules. (Basically,
//  * whether it is MolsToUse.Visible or MolsToUse.VisibleOrSelected.)
//  *
//  * @param  {MolsToUse} molsToUse  The molsToUse variable to check.
//  * @returns {boolean}  Whether the molsToUse variable includes visible
//  *     molecules.
//  */
// function molsToUseIncludesVisible(molsToUse: MolsToUse): boolean {
//     return (
//         [MolsToUse.Visible, MolsToUse.VisibleOrSelected].indexOf(molsToUse) !==
//         -1
//     );
// }

// /**
//  * Whether a given molsToUse variable includes selected molecules. (Basically,
//  * whether it is MolsToUse.Selected or MolsToUse.VisibleOrSelected.)
//  *
//  * @param  {MolsToUse} molsToUse  The molsToUse variable to check.
//  * @returns {boolean}  Whether the molsToUse variable includes selected
//  *     molecules.
//  */
// function molsToUseIncludesSelected(molsToUse: MolsToUse): boolean {
//     return (
//         [MolsToUse.Selected, MolsToUse.VisibleOrSelected].indexOf(molsToUse) !==
//         -1
//     );
// }

/**
 * Whether a given molecule is selected. It can be directly selected, or the
 * child of a selected molecule.
 *
 * @param  {TreeNode} mol  The molecule to check.
 * @returns {boolean}  Whether the molecule is selected.
 */
function isMolSelected(mol: TreeNode): boolean {
    return (
        [SelectedType.ChildOfTrue, SelectedType.True].indexOf(mol.selected) !==
        -1
    );
}
