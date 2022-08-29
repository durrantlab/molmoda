import { PluginParent } from "@/Plugins/PluginParent";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";

export function checkSomethingSelected(This: PluginParent): string | null {
    // Check if anything is currently selected
    const selectedNodes = getAllNodesFlattened(
        This.$store.state.molecules
    ).filter((n) => n.selected === SelectedType.TRUE);

    if (selectedNodes.length === 0) {
        return "No molecules are currently selected. First select a molecule by clicking on its name in the Molecules panel.";
    }

    return null;
}
