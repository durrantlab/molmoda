import { dynamicImports } from "./DynamicImports";

const hotkeysUsed: Set<string> = new Set();

let hotkeys: any = undefined;

// Detect if shift down
export let shiftKeyDown = false;
export let controlKeyDown = false;

// Detect click anywhere, but only once. Don't start listening for shift and
// control until then.
let clickDetected = false;
document.addEventListener("click", () => {
    if (!clickDetected) {
        clickDetected = true;
        hotkeysPromise()
            .then((hotkeys) => {
                hotkeys("*", { keyup: true }, (event: any) => {
                    if (hotkeys.shift) {
                        shiftKeyDown = event.type === "keydown";
                    }
                    if (hotkeys.ctrl) {
                        controlKeyDown = event.type === "keydown";
                    }
                    if (hotkeys.command) {
                        controlKeyDown = event.type === "keydown";
                    }
                });
                return;
            })
            .catch((err) => {
                console.error(err);
            });
    }
});

// If user unfocuses this tab, clear shift/control hotkeys.
window.addEventListener("blur", () => {
    shiftKeyDown = false;
    controlKeyDown = false;
});

/**
 * Get the hotkeys object (library). If it is not yet loaded, load it.
 * 
 * @returns {Promise<any>}  A promise that resolves to the hotkeys object.
 */
function hotkeysPromise(): Promise<any> {
    return hotkeys === undefined
        ? dynamicImports.hotkeys.module.then((mod) => {
              hotkeys = mod;
              return mod;
          })
        : Promise.resolve(hotkeys);
}

/**
 * Adds a hotkey to the hotkey list.
 *
 * @param {string}   hotkey    The hotkey to add.
 * @param {Function} callback  The function to run when the hotkey is pressed.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function registerHotkeys(hotkey: string, callback: Function) {
    if (hotkeysUsed.has(hotkey)) {
        const msg = `Two plugins are trying to use the same hotkey: ${hotkey}`;
        throw new Error(msg);
    }
    hotkeysUsed.add(hotkey);

    hotkeysPromise()
        .then((hotkeys) => {
            hotkeys(hotkey, callback);
            return;
        })
        .catch((err) => {
            console.log(err);
        });
}
