/**
 * Isolated factory for the EasyParser Web Worker. This file contains
 * the `import.meta.url` reference that webpack needs to bundle the
 * worker. It is kept in its own module so that Jest can swap it out
 * via moduleNameMapper without affecting the rest of the codebase.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: import.meta.url is handled by webpack at build time
// but is invalid under Jest's CommonJS module resolution.
export function createEasyParserWorker(): Worker {
    return new Worker(new URL("./EasyParser.worker", import.meta.url));
}