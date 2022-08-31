/* eslint-disable @typescript-eslint/ban-ts-comment */

import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

// @ts-ignore
import cloneDeep from "lodash.clonedeep";

export const undoStack: IMolContainer[][] = [];
export let redoStack: IMolContainer[][] = [];
let timeoutId: number;
const maxItemsOnUndoStack = 10;

/**
 * Pushes a new item to the undo stack.
 * 
 * @param  {IMolContainer[]} item The item to push.
 */
function addItemToUndoStack(item: IMolContainer[]) {
    if (undoStack.length > maxItemsOnUndoStack) {
        undoStack.shift();
    }
    undoStack.push(item);
}

// Add something to the stack after delay, to prevent adding excessive changes
// in rapid succession.

/**
 * Adds an item to the undo stack after the user has't done anything in a bit.
 * 
 * @param  {IMolContainer[]} molecules The item to push.
 */
export function addToUndoStackAfterUserInaction(molecules: IMolContainer[]) {
    if (timeoutId) {
        window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
        // Remove any redos.
        redoStack = [];

        // Make new molecule
        const moleculesObjToAddToStack = cloneDeep(molecules);
        
        getTerminalNodes(moleculesObjToAddToStack)
        .forEach((mol) => { mol.viewerDirty = true; });

        // Move new molecules to the stack
        addItemToUndoStack(moleculesObjToAddToStack);
        console.log("added");
        console.log(undoStack);
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

        console.log("undo");
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

        console.log("redo");
    }
}