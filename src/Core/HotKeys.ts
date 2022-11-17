import { dynamicImports } from "./DynamicImports";

const hotkeysUsed: Set<string> = new Set();

let hotkeys: any = undefined;

// eslint-disable-next-line @typescript-eslint/ban-types
export function registerHotkeys(hotkey: string, callback: Function) {
    if (hotkeysUsed.has(hotkey)) {
        const msg = `Two plugins are trying to use the same hotkey: ${hotkey}`;
        throw new Error(msg);
    }
    hotkeysUsed.add(hotkey);

    const hotkeysPromise =
        hotkeys === undefined
            ? dynamicImports.hotkeys.module.then((mod) => {
                  hotkeys = mod;
                  return mod;
              })
            : Promise.resolve(hotkeys);
    hotkeysPromise
        .then((hotkeys) => {
            hotkeys(hotkey, callback);
            return;
        })
        .catch((err) => {
            console.log(err);
        });
}
