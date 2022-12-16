import {
    IMolContainer,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    extractFlattenedContainers,
    getAllNodesFlattened,
    getNodeOfId,
} from "@/UI/Navigation/TreeView/TreeUtils";

/**
 * Gets a default IMolContainer.
 *
 * @returns {IMolContainer}  The default IMolContainer.
 */
export function getDefaultNodeToActOn(): IMolContainer {
    return {
        title: "",
        treeExpanded: false,
        selected: SelectedType.False,
        visible: false,
        focused: false,
        viewerDirty: false,
    };
}

/**
 * Determine which node to act on. Mostly likely the selected molecule.
 *
 * @param  {any} This  The associated Editbar Vue component.
 */
export function setNodesToActOn(This: any) {
    if (This.payload) {
        // this.payload is the node id.
        const id = This.payload;
        This.nodesToActOn = [
            getNodeOfId(id, This.$store.state.molecules),
        ] as IMolContainer[];
    } else {
        // Find the selected molecules instead.
        const nodes = getAllNodesFlattened(This.$store.state.molecules);
        This.nodesToActOn = extractFlattenedContainers(nodes, {
            selected: SelectedType.True,
        });
    }

    if (!This.nodesToActOn) {
        // TODO: fix this
        alert("You shouldn't be able to run this if no molecule is selected.");
    }
}
