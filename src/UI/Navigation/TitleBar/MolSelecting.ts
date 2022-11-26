import { controlKeyDown, shiftKeyDown } from "@/Core/HotKeys";
import { getStoreVar } from "@/Store/StoreExternalAccess";
import { SelectedType, IMolContainer } from "../TreeView/TreeInterfaces";
import { getAllNodesFlattened, getNodeOfId } from "../TreeView/TreeUtils";

export const selectInstructionsBrief =
    "Click + Ctrl/Shift/Cmd to select multiple";
export const selectInstructionsLong =
    "Click while holding down the Control, Command (Mac), or Shift key to select multiple molecules.";

/**
 * Selects node(s) and their children. Accounts for different key combinations
 * (ctrl, shift, cmd).
 *
 * @param  {string}          id           The id of the last node selected.
 * @param  {IMolContainer[]} molTreeData  The molecule tree data.
 */
export function doSelecting(id: string, molTreeData: IMolContainer[]) {
    const node = getNodeOfId(id, molTreeData);

    if (node === null) {
        // Not much you can do.
        return;
    }

    // If control key is down, toggle selected and its children.
    if (controlKeyDown) {
        if (
            node.selected === SelectedType.True ||
            node.selected === SelectedType.ChildOfTrue
        ) {
            setSelectWithChildren(node, SelectedType.False);
        } else {
            setSelectWithChildren(node, SelectedType.True);
        }
        return;
    }

    // If shift key is down, selecting multiple items.
    if (shiftKeyDown) {
        const flattened = getAllNodesFlattened(getStoreVar("molecules"));
        // Go through flattened, save the node if it is selected.
        let mostRecentSelected: IMolContainer | null = null;
        for (const nd of flattened) {
            if (nd.selected !== SelectedType.False) {
                mostRecentSelected = nd;
            }
            if (nd.id === id && mostRecentSelected !== null) {
                // If one has been selected and you've reached this id, stop looking.
                // So a previous one will be selected even if a subsequent one is
                // closer. Using subsequent one only if necessary.
                break;
            }
        }

        if (mostRecentSelected !== null && mostRecentSelected.id !== id) {
            // Note that if it is null, will treat as if shift not pressed (no
            // return outside of associated if statement).
            let selecting = false;
            for (const nd of flattened) {
                if (nd.id === mostRecentSelected.id || nd.id === id) {
                    selecting = !selecting;
                }
                if (selecting) {
                    setSelectWithChildren(nd, SelectedType.True);
                }
            }
            setSelectWithChildren(node, SelectedType.True);
            // debugger;
            return;
        }
    }

    // No control or shift pressed if you get here.

    const allNodesFlattened = getAllNodesFlattened(getStoreVar("molecules"));
    const numSelected = allNodesFlattened.reduce(
        (acc, nd) => acc + (nd.selected === SelectedType.True ? 1 : 0),
        0
    );
    const currentlySelected = node.selected;

    // Unselect all nodes.
    for (const nd of allNodesFlattened) {
        nd.selected = SelectedType.False;
    }

    // Select the one you clicked on if if was previously not selected, or
    // multiple ones were previously selected.
    if (currentlySelected === SelectedType.False || numSelected > 1) {
        setSelectWithChildren(node, SelectedType.True);
    }
}

/**
 * Sets the selected property of a node and its children.
 *
 * @param  {IMolContainer} node                          The node to set.
 * @param  {SelectedType}  [selected=SelectedType.True]  The selected property
 *                                                       to set.
 */
function setSelectWithChildren(
    node: IMolContainer,
    selected = SelectedType.True
) {
    node.selected = selected;

    // Children too
    if (node.nodes) {
        const childrenSelection =
            selected === SelectedType.True
                ? SelectedType.ChildOfTrue
                : SelectedType.False;
        for (const nd of getAllNodesFlattened(node.nodes)) {
            nd.selected = childrenSelection;
        }
    }
}
