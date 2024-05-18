// Utilities to make it easier to work with Electron

import { IMenuEntry } from "@/UI/Navigation/Menu/Menu";

export function isElectron() {
    // return true;
    return (window as any).electronAPI !== undefined;
}

export function setupElectron() {
    if (!isElectron()) {
        return;
    }
}

export function closeElectron() {
    if (!isElectron()) {
        return;
    }

    // Close the window
    (window as any).electronAPI.closeProgram();
}


(window as any).isElectron = isElectron;
