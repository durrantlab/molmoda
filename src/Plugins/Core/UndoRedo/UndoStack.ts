/* eslint-disable @typescript-eslint/ban-ts-comment */

import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

// @ts-ignore
import cloneDeep from "lodash.clonedeep";

export const undoStack: TreeNodeList[] = [new TreeNodeList()];
export let redoStack: TreeNodeList[] = [];
let timeoutId: number;
const maxItemsOnUndoStack = 10;

/**
 * Pushes a new item to the undo stack.
 * 
 * @param  {TreeNodeList} item The item to push.
 */
function addItemToUndoStack(item: TreeNodeList) {
    if (undoStack.length > maxItemsOnUndoStack) {
        undoStack.shift();
    }
    undoStack.push(item);
}

/**
 * Adds an item to the undo stack after the user has't done anything in a bit.
 * By adding to the stack only after a delay, you prevent adding excessive
 * changes in rapid succession.
 *
 * @param  {TreeNodeList} molecules The item to push.
 */
export function addToUndoStackAfterUserInaction(molecules: TreeNodeList) {
    if (timeoutId) {
        window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
        // Remove any redos.
        redoStack = [];

        // Make new molecule
        const moleculesObjToAddToStack = cloneDeep(molecules) as TreeNodeList;
        
        moleculesObjToAddToStack.filters.onlyTerminal
        .forEach((mol: TreeNode) => { mol.viewerDirty = true; });

        // Move new molecules to the stack
        addItemToUndoStack(moleculesObjToAddToStack);
        // console.log("added");
    }, 1000);
}

/**
 * Undo the last user action.
 * 
 * @param  {any} store The Vuex store.
 */
export function undo(store: any) {
    let lastItemOnUndoStack = undoStack.pop();
    if (lastItemOnUndoStack) {
        // Move current last one to redo.
        redoStack.push(lastItemOnUndoStack);

        // Get the new last one, but keep on stack
        lastItemOnUndoStack = undoStack[undoStack.length - 1];

        if (lastItemOnUndoStack) {
            // store.commit("replaceMolecules", lastItemOnUndoStack);
            store.commit("setVar", {
                name: "molecules",
                val: lastItemOnUndoStack,
            });
    
            // Make sure this undo isn't itself added to the undo stack.
            setTimeout(() => {
                window.clearTimeout(timeoutId);
            }, 0);
        }

        // console.log("undo");
    }
}

/**
 * Redo the last user action.
 * 
 * @param  {any} store The Vuex store.
 */
export function redo(store: any) {   
    const lastItemRedoStack = redoStack.pop();
    if (lastItemRedoStack) {
        // Move current last one to redo.
        addItemToUndoStack(lastItemRedoStack);

        // store.commit("replaceMolecules", lastItemOnUndoStack);
        store.commit("setVar", {
            name: "molecules",
            val: lastItemRedoStack,
        });

        // Make sure this undo isn't itself added to the undo stack.
        setTimeout(() => {
            window.clearTimeout(timeoutId);
        }, 0);

        // console.log("redo");
    }
}