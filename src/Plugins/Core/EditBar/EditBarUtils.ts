import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * Gets a default TreeNode.
 *
 * @returns {TreeNode}  The default TreeNode.
 */
export function getDefaultNodeToActOn(): TreeNode {
    return new TreeNode({
        title: "",
        treeExpanded: false,
        selected: SelectedType.False,
        visible: false,
        focused: false,
        viewerDirty: false,
    });
}

/**
 * Determine which node to act on. Mostly likely the selected molecule.
 *
 * @param  {any}     This                 The associated Editbar Vue component.
 * @param  {string}  nodeId               The node id to act on.
 * @param  {boolean} terminalAnySelected  Whether to only consider terminal
 *                                        nodes taht are selected. Otherwise,
 *                                        considers all selected.
 */
export function setNodesToActOn(This: any, nodeId: string, terminalAnySelected = false) {
    if (nodeId) {
        // this.payload is the node id.
        const id = nodeId;
        This.nodesToActOn = new TreeNodeList([
            (This.$store.state.molecules as TreeNodeList).filters.onlyId(
                id
            ) as TreeNode,
        ]);
    } else {
        // Find the selected molecules instead.
        if (terminalAnySelected) {
            const nodes = (This.$store.state.molecules as TreeNodeList).filters
                .onlyTerminal;
            This.nodesToActOn = nodes.filters.keepSelected(true);
        } else {
            const nodes = (This.$store.state.molecules as TreeNodeList)
                .flattened;
            This.nodesToActOn = nodes.filters.keepSelected(SelectedType.True);
        }
    }

    if (!This.nodesToActOn) {
        // TODO: fix this
        alert("You shouldn't be able to run this if no molecule is selected.");
    }
}
