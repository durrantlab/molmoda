import { controlKeyDown, shiftKeyDown } from "@/Core/HotKeys";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "../../../TreeNodes/TreeNode/TreeNode";
import { SelectedType } from "../TreeView/TreeInterfaces";
import { TreeNodeList } from "../../../TreeNodes/TreeNodeList/TreeNodeList";

export const selectInstructionsBrief =
    "Ctrl/Shift/Cmd + Click to select multiple";
export const selectInstructionsLong =
    "Click while holding down the Control, Command (Mac), or Shift key to select multiple molecules.";

/**
 * Checks whether the a node passes the user-specified filter, if any.
 *
 * @param  {TreeNode} node        The node to check.
 * @param  {string}   filterStr   The filter string.
 * @returns {boolean}  Whether the node passes the filter.
 */
function _checkNodePassesFilter(node: TreeNode, filterStr: string): boolean {
    if (filterStr === "") {
        return true;
    }

    return node.title.toLowerCase().indexOf(filterStr) !== -1;
}

/**
 * Selects multiple nodes. Accounts for shift.
 *
 * @param  {string}   filterStr         The filter string.
 * @param  {string}   idLastSelected    The id of the last node selected.
 * @param  {TreeNode} nodeLastSelected  The last node selected.
 * @returns {boolean}  Whether the shift key was down.
 */
function _selectShiftDown(
    filterStr: string,
    idLastSelected: string,
    nodeLastSelected: TreeNode
): boolean {
    const { flattened } = getMoleculesFromStore();

    // Go through flattened, save the node if it is selected.
    let mostRecentSelected: TreeNode | null = null;
    for (let idx = 0; idx < flattened.length; idx++) {
        const nd = flattened.get(idx);
        if (nd.selected !== SelectedType.False) {
            mostRecentSelected = nd;
        }
        if (nd.id === idLastSelected && mostRecentSelected !== null) {
            // If one has been selected and you've reached this id, stop looking.
            // So a previous one will be selected even if a subsequent one is
            // closer. Using subsequent one only if necessary.
            break;
        }
    }

    filterStr = filterStr.toLowerCase();

    if (
        mostRecentSelected !== null &&
        mostRecentSelected.id !== idLastSelected
    ) {
        // Note that if it is null, will treat as if shift not pressed (no
        // return outside of associated if statement).
        let selecting = false;
        flattened.forEach((nd: TreeNode) => {
            if (
                (mostRecentSelected !== null &&
                    nd.id === mostRecentSelected.id) ||
                nd.id === idLastSelected
            ) {
                selecting = !selecting;
            }
            if (selecting && _checkNodePassesFilter(nd, filterStr)) {
                setSelectWithChildren(nd, SelectedType.True);
            }
        });
        if (_checkNodePassesFilter(nodeLastSelected, filterStr)) {
            setSelectWithChildren(nodeLastSelected, SelectedType.True);
        }
        return true;
    }
    return false;
}

/**
 * Selects a node and its children. Accounts for control.
 *
 * @param  {TreeNode} nodeLastSelected  The last node selected.
 */
function _selectControlDown(nodeLastSelected: TreeNode) {
    if (
        nodeLastSelected.selected === SelectedType.True ||
        nodeLastSelected.selected === SelectedType.ChildOfTrue
    ) {
        setSelectWithChildren(nodeLastSelected, SelectedType.False);
    } else {
        setSelectWithChildren(nodeLastSelected, SelectedType.True);
    }
}

/**
 * Selects node(s) and their children. Accounts for different key combinations
 * (ctrl, shift, cmd).
 *
 * @param  {string}        idLastSelected  The id of the last node selected.
 * @param  {TreeNodeList}  molTreeData     The molecule tree data.
 * @param  {string}        [filterStr=""]  The filter string.
 */
export function doSelecting(
    idLastSelected: string,
    molTreeData: TreeNodeList,
    filterStr = ""
) {
    const nodeLastSelected = molTreeData.filters.onlyId(idLastSelected);

    if (nodeLastSelected === null) {
        // Not much you can do.
        return;
    }

    // If shift key is down, selecting multiple items.
    if (
        shiftKeyDown &&
        _selectShiftDown(filterStr, idLastSelected, nodeLastSelected)
    ) {
        return;
    }

    // If control key is down, toggle selected and its children.
    if (controlKeyDown) {
        _selectControlDown(nodeLastSelected);
        return;
    }

    // No control or shift pressed if you get here.
    const allNodesFlattened = getMoleculesFromStore().flattened;
    const numSelected = allNodesFlattened.reduce(
        (acc: number, nd: TreeNode) =>
            acc + (nd.selected === SelectedType.True ? 1 : 0),
        0
    );
    const currentlySelected = nodeLastSelected.selected;

    // Unselect all nodes.
    unselectAll(allNodesFlattened);

    // Select the one you clicked on if if was previously not selected, or
    // multiple ones were previously selected.
    if (currentlySelected === SelectedType.False || numSelected > 1) {
        setSelectWithChildren(nodeLastSelected, SelectedType.True);
    }
}

/**
 * Unselects all nodes.
 *
 * @param  {TreeNodeList} flattenedNodes  The nodes to consider, flattened.
 */
function unselectAll(flattenedNodes: TreeNodeList) {
    // Unselect all nodes.
    flattenedNodes.forEach((nd) => {
        nd.selected = SelectedType.False;
    });
}

/**
 * Sets the selected property of a node and its children.
 *
 * @param  {TreeNode} node                          The node to set.
 * @param  {SelectedType}  [selected=SelectedType.True]  The selected property
 *                                                       to set.
 */
function setSelectWithChildren(node: TreeNode, selected = SelectedType.True) {
    node.selected = selected;
    const children = node.nodes;

    // Children too
    if (children) {
        const childrenSelection =
            selected === SelectedType.True
                ? SelectedType.ChildOfTrue
                : SelectedType.False;
        children.flattened.forEach((nd: TreeNode) => {
            nd.selected = childrenSelection;
        });
    }
}

let waitForScollInterval: any = null;
let waitForScrollStart = 0;

/**
 * Selects a given node programatically.
 *
 * @param  {string} id  The id of the node to select.
 */
export function selectProgramatically(id: string) {
    const allMols = getMoleculesFromStore();
    const node = allMols.filters.onlyId(id);
    if (!node) {
        // null?
        return;
    }

    unselectAll(allMols.flattened);
    setSelectWithChildren(node, SelectedType.True);

    // Expand all parents.
    const ancestors = node.getAncestry(allMols);
    ancestors.forEach((anc: TreeNode) => {
        anc.treeExpanded = true;
    });

    if (waitForScollInterval) {
        clearInterval(waitForScollInterval);
    }

    waitForScrollStart = new Date().getTime();
    waitForScollInterval = setInterval(() => {
        const selected = document.getElementsByClassName(
            "selected"
        )[0] as HTMLElement;
        if (selected) {
            // selected.scrollIntoView();
            // scroll gradually over 1 sec
            // selected.scrollIntoView({ behavior: "smooth", block: "center" });

            // Helpful: https://stackoverflow.com/questions/51618548/scrollintoview-is-not-working-does-not-taking-in-account-fixed-element
            const wrapper = document.getElementById("navigator")
                ?.parentElement as HTMLElement;
            const count =
                selected.offsetTop -
                wrapper.scrollTop -
                0.5 * wrapper.offsetHeight; // xx = any extra distance from top ex. 60

            wrapper.scrollBy({ top: count, left: 0, behavior: "smooth" });

            clearInterval(waitForScollInterval);
        } else if (new Date().getTime() - waitForScrollStart > 3000) {
            // Give up after a bit.
            clearInterval(waitForScollInterval);
        }
    }, 500);
}
