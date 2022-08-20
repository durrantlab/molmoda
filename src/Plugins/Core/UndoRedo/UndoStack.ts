import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

const undoStack: IMolContainer[][] = [];
let redoStack: IMolContainer[][] = [];
let moleculesObjToAddToStack: IMolContainer[] = [];
let timeoutId: number;

// Only add something to the stack after delay, to prevent adding too many
// things in rapid succession.
export function addToUndoStack(molecules: IMolContainer[]): void {
    moleculesObjToAddToStack = molecules;
    if (timeoutId) {
        window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
        // Remove any redos.
        redoStack = [];

        // Move new molecules to the stack
        undoStack.push(moleculesObjToAddToStack);
        moleculesObjToAddToStack = [];
        console.log("added");
    }, 2000);
}

export function undo(store: any): void {
    debugger
    const lastItemOnUndoStack = undoStack.pop();
    if (lastItemOnUndoStack) {
        redoStack.push(lastItemOnUndoStack);
        store.commit("replaceMolecules", lastItemOnUndoStack);
        console.log("undo");
    }

    // if (currentUndoStackIndex > 0) {
    //     currentUndoStackIndex--;
    //     const newMolecules = undoStack[currentUndoStackIndex];
}