/* eslint-disable @typescript-eslint/ban-ts-comment */

import { store } from "@/Store";
import { treeNodeListDeepClone } from "@/TreeNodes/Deserializers";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

let timeoutId: number;
const maxItemsOnUndoStack = 10;
let pauseAddToUndoStack = false;

// setInterval(() => {
//     console.log(
//         store.state.undoStack.map((m: any) => m.undoStackId).length,
//         store.state.redoStack.map((m: any) => m.undoStackId).length,
//     );
// }
// , 1000);

/**
 * Temporarily pauses adding to the undo stack.
 */
function _tmpPauseAddToUndoStack() {
    // Cancel any pending additions to undo stack

    window.clearTimeout(timeoutId);

    // Prevent new ones.
    pauseAddToUndoStack = true;

    // In a bit, start allowing again
    setTimeout(() => {
        pauseAddToUndoStack = false;
    }, 500);
}

/**
 * Makes all molecules dirty.
 *
 * @param  {TreeNodeList} mols The molecules.
 */
function _makeAllMolsDirty(mols: TreeNodeList) {
    mols.filters.onlyTerminal.forEach((mol: TreeNode) => {
        mol.viewerDirty = true;
    });
}

/**
 * Pushes a new item to the undo stack.
 *
 * @param  {TreeNodeList} item The item to push.
 */
function _addItemToUndoStack(item: TreeNodeList) {
    const undoStack = store.state.undoStack as TreeNodeList[];
    if (undoStack.length > maxItemsOnUndoStack) {
        undoStack.shift();
    }
    undoStack.push(item);
    store.commit("setVar", {
        name: "undoStack",
        val: undoStack,
    });
}

/**
 * Adds an item to the undo stack after the user has't done anything in a bit.
 * By adding to the stack only after a delay, you prevent adding excessive
 * changes in rapid succession.
 *
 * @param  {TreeNodeList} molecules The item to push.
 */
export function addToUndoStackAfterUserInaction(molecules: TreeNodeList) {
    if (pauseAddToUndoStack) {
        return;
    }

    if (timeoutId) {
        window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(async () => {
        // Remove any redos.
        store.commit("setVar", {
            name: "redoStack",
            val: [],
        });

        // Make new molecule.
        const moleculesObjToAddToStack = await treeNodeListDeepClone(molecules);

        _makeAllMolsDirty(moleculesObjToAddToStack);
        // moleculesObjToAddToStack.filters.onlyTerminal
        // .forEach((mol: TreeNode) => { mol.viewerDirty = true; });

        // Move new molecules to the stack
        _addItemToUndoStack(moleculesObjToAddToStack);
        // console.log("added");
    }, 1000);
}

/**
 * Undo the last user action.
 *
 * @param  {any} store The Vuex store.
 */
export function undo(store: any) {
    const undoStack = store.state.undoStack as TreeNodeList[];
    const redoStack = store.state.redoStack as TreeNodeList[];

    let lastItemOnUndoStack = undoStack.pop();

    // Update the stacks
    store.commit("setVar", {
        name: "undoStack",
        val: undoStack,
    });

    if (lastItemOnUndoStack) {
        // Move current last one to redo.
        redoStack.push(lastItemOnUndoStack);

        store.commit("setVar", {
            name: "redoStack",
            val: redoStack,
        });

        // Get the new last one, but keep on stack
        lastItemOnUndoStack = undoStack[undoStack.length - 1];

        if (lastItemOnUndoStack) {
            // _makeAllMolsDirty(lastItemOnUndoStack)

            // store.commit("replaceMolecules", lastItemOnUndoStack);
            store.commit("setVar", {
                name: "molecules",
                val: lastItemOnUndoStack,
            });

            // Make sure this undo isn't itself added to the undo stack.
            _tmpPauseAddToUndoStack();
        }

        // console.log("undo");
    }
}

/**
 * Redo the last user action.
 *
 * @param  {any} store The Vuex store.
 */
export async function redo(store: any) {
    const redoStack = store.state.redoStack as TreeNodeList[];

    const lastItemRedoStack = redoStack.pop();

    // Update the stacks
    store.commit("setVar", {
        name: "redoStack",
        val: redoStack,
    });

    if (lastItemRedoStack) {
        // Move current last one to redo.
        _addItemToUndoStack(lastItemRedoStack);

        // store.commit("replaceMolecules", lastItemOnUndoStack);
        store.commit("setVar", {
            name: "molecules",
            val: lastItemRedoStack,
        });

        // const viewer = await api.visualization.viewer;
        // viewer.renderAll();

        // Make sure this undo isn't itself added to the undo stack.
        _tmpPauseAddToUndoStack();

        // console.log("redo");
    }
}
