/**
 * Jest mock for EasyParserWorkerFactory. Returns a dummy object since
 * Web Workers are not available in the Jest/Node environment.
 */
export function createEasyParserWorker(): never {
    throw new Error(
        "createEasyParserWorker: Web Workers are not available in the test environment."
    );
}