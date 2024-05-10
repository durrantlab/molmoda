import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";

// Get start molecule
export function getUpDownTreeNavMoleculesToActOn(): {
    molBefore: TreeNode | null;
    molToConsider: TreeNode
     | null;
    molAfter: TreeNode | null;
} {
    // Get all molecules.
    const molecules = getMoleculesFromStore().flattened;

    // Get the first one that is selected.
    let molsToConsider = molecules.filters.keepSelected();

    if (molsToConsider.length == 0) {
        // Since no selected molecules, consider the visible ones.
        molsToConsider = molecules.filters.keepVisible();
    }

    if (molsToConsider.length == 0) {
        // Since no visible molecules, consider all.
        molsToConsider = molecules;
    }

    if (molsToConsider.length == 0) {
        // Since no molecules, do nothing.
        return { molBefore: null, molToConsider: null, molAfter: null };
    }

    // Remove all selections (because will be set in a bit).
    molecules.map((m) => m.selected = SelectedType.False);

    // Remove all focused
    molecules.map((m) => m.focused = false);

    // Get the first one.
    const molToConsider = molsToConsider.get(0);

    // Now keep only the molecules with the same parentId.
    const {parentId} = molToConsider;
    const siblings = molecules.filter((m) => {
        return m.parentId === parentId
    });

    // Now get the index in the list of all molecules.
    const index = siblings._nodes.indexOf(molToConsider);

    const indexBefore = index - 1 < 0 ? siblings._nodes.length - 1 : index - 1;
    const indexAfter = index + 1 >= siblings._nodes.length ? 0 : index + 1;

    const molBefore = siblings._nodes[indexBefore];
    const molAfter = siblings._nodes[indexAfter];

    return { molBefore, molToConsider, molAfter };
}

export function toggleUpDownTreeNav(newTreeNode: TreeNode, oldTreeNode: TreeNode) {
    const treeNode1Visibility = newTreeNode.visible;
    const treeNode2Visibility = oldTreeNode.visible;
    newTreeNode.visible = treeNode2Visibility;
    oldTreeNode.visible = treeNode1Visibility;

    newTreeNode.selected = SelectedType.True;
    newTreeNode.focused = true;

    newTreeNode.viewerDirty = true;
    oldTreeNode.viewerDirty = true;

    selectProgramatically(newTreeNode.id as string);
}

// let listenerAdded = false;

// export function setupUpDownTreeNav() {
//     if (listenerAdded) {
//         return;
//     }
//     document.addEventListener("keydown", handleKeyDown);
//     listenerAdded = true;
// }

// function handleKeyDown(event: KeyboardEvent) {
//     const { key } = event;

//     // Get all molecules.
//     const molecules = getMoleculesFromStore().flattened;
//     // Get the first one that is selected.
//     const selected = molecules.filters.keepSelected();

//     debugger

//     if (key === "ArrowUp") {
//         // Handle the up arrow key press
//         console.log("Up arrow key pressed");
//         // Add your desired behavior here
//     } else if (key === "ArrowDown") {
//         // Handle the down arrow key press
//         console.log("Down arrow key pressed");
//         // Add your desired behavior here
//     }
// }
