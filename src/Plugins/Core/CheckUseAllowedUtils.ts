import { PluginParentRenderless } from "@/Plugins/Parents/PluginParent/PluginParentRenderless";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";

/**
 * Checks whether the user has selected a molecule.
 *
 * @param  {PluginParentRenderless} This  The associated EditBarPlugin.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkAnyMolSelected(This: PluginParentRenderless): string | null {
    // Check if user has selected anything
    const selectedNodes = getAllNodesFlattened(
        This.$store.state.molecules
    ).filter((n) => n.selected === SelectedType.TRUE);

    if (selectedNodes.length === 0) {
        return "No molecules are currently selected. First select a molecule by clicking on its name in the Molecules panel.";
    }

    return null;
}

/**
 * Checks whether the user has loaded any molecule.
 *
 * @param  {PluginParentRenderless} This  The associated EditBarPlugin.
 * @returns {string | null}  An error if the user hasn't selected any molecules,
 *     null otherwise.
 */
export function checkanyMolLoaded(This: PluginParentRenderless): string | null {
    if (This.$store.state.molecules.length === 0) {
        return "Nothing to save or export (empty project). Try adding molecules first.";
    }

    return null;
}
