// All your workers should use this.

export function waitForDataFromMainThread(): Promise<any> {
    return new Promise((resolve, reject) => {
        self.onmessage = (payload: MessageEvent) => {
            resolve(payload.data);
        };
    });
}

export function sendResponseToMainThread(data: any): void {
    self.postMessage(data);
}