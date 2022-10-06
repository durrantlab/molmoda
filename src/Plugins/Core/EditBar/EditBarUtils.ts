import {
    IMolContainer,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
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
        selected: SelectedType.FALSE,
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
export function setNodeToActOn(This: any) {
    if (This.payload) {
        // this.payload is the node id.
        const id = This.payload;
        This.nodeToActOn = getNodeOfId(
            id,
            This.$store.state.molecules
        ) as IMolContainer;
    } else {
        // Find the selected molecule instead.
        const nodes = getAllNodesFlattened(This.$store.state.molecules);
        This.nodeToActOn = nodes.find(
            (n) => n.selected === SelectedType.TRUE
        ) as IMolContainer;
    }

    if (!This.nodeToActOn) {
        // TODO: fix this
        alert("You shouldn't be able to run this if no molecule is selected.");
    }
}
