// All your workers should use this.

import type { FileInfo } from "@/FileSystem/FileInfo";

const ctx: Worker = self as any;

export interface IMolData {
    format: string;
    fileInfo: FileInfo;
}

/**
 * A function that waits for a message from the main thread. NOTE: This only
 * runs once, and then the promise is resolved. So if you hope to reuse a
 * webworker (it's not auto terminating), this is not the function for you.
 *
 * @returns {Promise} A promise that resolves with the data from the main thread
 *                    when available.
 */
export function waitForDataFromMainThread(): Promise<IMolData[]> {
    return new Promise((resolve) => {
        self.onmessage = (payload: MessageEvent) => {
            resolve(payload.data);
        };
    });
}

/**
 * Sends data to the main thread.
 *
 * @param  {any} data The data to send.
 */
export function sendResponseToMainThread(data: any) {
    ctx.postMessage(data);
}
