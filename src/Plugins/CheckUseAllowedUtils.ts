import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { selectInstructionsLong } from "@/UI/Navigation/TitleBar/MolSelecting";
import {
    SelectedType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";

/**
 * Checks whether the user has selected any molecule.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *                                     Ultimately defaults to all molecules if
 *                                     not specified.
 * @param  {string}           noun     The noun to use in the error message.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolSelected(
    treeNodeList?: TreeNodeList,
    noun = "molecule"
): string | null {
    const num = _numSelected(treeNodeList);
    if (num === 0) {
        return `No ${noun}s are currently selected. First select a ${noun} by clicking on its name in the Navigator panel.`;
    }

    return null;
}

/**
 * Checks whether the user has selected any compound.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *                                        Ultimately defaults to all molecules
 *                                        if not specified.
 * @returns {string | null}  An error if the user hasn't selected any proteins,
 *     null otherwise.
 */
export function checkAnyCompoundSelected(
    treeNodeList?: TreeNodeList
): string | null {
    if (treeNodeList === undefined) {
        treeNodeList = getMoleculesFromStore();
    }

    const compounds = treeNodeList.flattened.filters.keepType(
        TreeNodeType.Compound
    );
    const selectedCompounds = compounds.filters.keepSelected(true);

    if (selectedCompounds.length === 0) {
        return "No compounds are currently selected. First select a compound by clicking on its name in the Navigator panel.";
    }

    return null;
}

/**
 * Checks whether the user has selected one and only one molecule.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *                                     Ultimately defaults to all molecules if
 *                                     not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkOneMolSelected(
    treeNodeList?: TreeNodeList
): string | null {
    const num = _numSelected(treeNodeList);
    if (num !== 1) {
        return "First select one (and only one) molecule by clicking on its name in the Navigator panel.";
    }

    return null;
}

/**
 * Checks whether the user has selected multiple molecules (> 1).
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {string | null}  An error if the user hasn't selected multiple
 *     molecules, null otherwise.
 */
export function checkMultipleMolsSelected(
    treeNodeList?: TreeNodeList
): string | null {
    const num = _numSelected(treeNodeList);
    if (num < 2) {
        return `First select at least two molecules by clicking on their names in the Navigator panel. ${selectInstructionsLong}`;
        // Click while holding down the Control, Command (Mac), and/or Shift keys to select multiple molecules.";
    }

    return null;
}

/**
 * Gets the number of molecules selected.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {number}  The number of molecules selected.
 */
function _numSelected(treeNodeList?: TreeNodeList): number {
    if (treeNodeList === undefined) {
        treeNodeList = getMoleculesFromStore();
    }

    // Check if user has selected anything
    const selectedNodes = (
        treeNodeList as TreeNodeList
    ).flattened.filters.keepSelected(SelectedType.True);
    return selectedNodes.length;
}

/**
 * Checks whether the user has loaded any molecule.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to
 *                                            consider. Ultimately defaults to
 *                                            all molecules if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolLoaded(treeNodeList?: TreeNodeList): string | null {
    if (treeNodeList === undefined) {
        treeNodeList = getMoleculesFromStore();
    }

    if ((treeNodeList as TreeNodeList).length === 0) {
        return "No molecules are currently loaded (empty project). Try adding molecules first.";
    }

    return null;
}

/**
 * Checks whether the user has loaded any molecule of the given type.
 *
 * @param  {TreeNodeType} type            The type of molecule to check for.
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *                                        Ultimately defaults to all molecules
 *                                        if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *    null otherwise.
 */
function _checkTypeLoaded(
    type: TreeNodeType,
    treeNodeList?: TreeNodeList
): string | null {
    if (treeNodeList === undefined) {
        treeNodeList = getMoleculesFromStore();
    }

    const entries = treeNodeList.flattened.filters.keepType(type);

    if (entries.length === 0) {
        return `No ${type} is currently loaded. Try adding a ${type} first.`;
    }

    return null;
}

/**
 * Checks whether the user has loaded any protein.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *                                        Ultimately defaults to all molecules
 *                                        if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *   null otherwise.
 */
export function checkProteinLoaded(treeNodeList?: TreeNodeList): string | null {
    return _checkTypeLoaded(TreeNodeType.Protein, treeNodeList);
}

/**
 * Checks whether the user has loaded any protein or nucleic acid.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *          Ultimately defaults to all molecules
 *          if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *   null otherwise.
 */
export function checkProteinOrNucleicLoaded(
    treeNodeList?: TreeNodeList
): string | null {
    if (treeNodeList === undefined) {
        treeNodeList = getMoleculesFromStore();
    }
    const proteins = treeNodeList.flattened.filters.keepType(
        TreeNodeType.Protein
    );
    const nucleicAcids = treeNodeList.flattened.filters.keepType(
        TreeNodeType.Nucleic
    );

    if (proteins.length === 0 && nucleicAcids.length === 0) {
        return "No protein or nucleic acid is currently loaded. Try adding a receptor first.";
    }
    return null;
}

/**
 * Checks whether the user has loaded any compound.
 *
 * @param  {TreeNodeList} [treeNodeList]  The molecule containers to consider.
 *                                        Ultimately defaults to all molecules
 *                                        if not specified.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkCompoundLoaded(
    treeNodeList?: TreeNodeList
): string | null {
    return _checkTypeLoaded(TreeNodeType.Compound, treeNodeList);
}

/**
 * Checks if at least two top-level molecules containing proteins are loaded.
 * A top-level molecule is considered to contain a protein if it or any of its
 * descendants has the type `TreeNodeType.Protein`.
 *
 * @param {TreeNodeList} [treeNodeList] The list of molecules to consider.
 *          Defaults to all molecules from the store.
 * @returns {string | null} An error message if the condition is not met, otherwise null.
 */
export function checkMultipleTopLevelProteinsLoaded(
    treeNodeList?: TreeNodeList
): string | null {
    if (treeNodeList === undefined) {
        treeNodeList = getMoleculesFromStore();
    }
    let proteinContainerCount = 0;
    // `treeNodeList` at the root is a list of top-level molecules.
    treeNodeList.forEach((topLevelNode: TreeNode) => {
        // For each top-level node, check if it or any of its descendants is a protein.
        const flattenedDescendants = new TreeNodeList([topLevelNode]).flattened;
        const hasProtein = flattenedDescendants.some(
            (node) => node.type === TreeNodeType.Protein
        );
        if (hasProtein) {
            proteinContainerCount++;
        }
    });
    if (proteinContainerCount < 2) {
        return "At least two molecules with protein components are required for alignment.";
    }
    return null;
}
