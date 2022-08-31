// All your workers should use this.

const ctx: Worker = self as any;

/**
 * A function that waits for a message from the main thread.
 *
 * @returns {Promise} A promise that resolves with the data from the main thread
 *                    when available.
 */
export function waitForDataFromMainThread(): Promise<any> {
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