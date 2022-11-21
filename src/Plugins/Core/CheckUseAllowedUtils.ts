import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";

/**
 * Checks whether the user has selected any molecule.
 *
 * @param  {PluginParentClass} This  The associated EditBarPlugin.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolSelected(This: PluginParentClass): string | null {
    const num = numSelected(This);
    if (num === 0) {
        return "No molecules are currently selected. First select a molecule by clicking on its name in the Molecules panel.";
    }

    return null;
}

/*
 * Checks whether the user has selected one and only one molecule.
 *
 * @param  {PluginParentClass} This  The associated EditBarPlugin. @returns
 * {string | null}  An error if the user hasn't selected any molecules, null
 * otherwise.
 */
export function checkOneMolSelected(This: PluginParentClass): string | null {
    const num = numSelected(This);
    if (num !== 1) {
        return "First select one (and only one) molecule by clicking on its name in the Molecules panel.";
    }

    return null;
}

function numSelected(This: PluginParentClass): number {
    // Check if user has selected anything
    const selectedNodes = getAllNodesFlattened(
        This.$store.state.molecules
    ).filter((n) => n.selected === SelectedType.True);
    return selectedNodes.length;
}

/**
 * Checks whether the user has loaded any molecule.
 *
 * @param  {PluginParentClass} This  The associated EditBarPlugin.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolLoaded(This: PluginParentClass): string | null {
    if (This.$store.state.molecules.length === 0) {
        return "Nothing to save or export (empty project). Try adding molecules first.";
    }

    return null;
}
