import { dynamicImports } from "./DynamicImports";

const hotkeysUsed: Set<string> = new Set();

let hotkeys: any = undefined;

// Detect if shift down
export let shiftKeyDown = false;
export let controlKeyDown = false;

/**
 * Check if text is selected.
 *
 * @returns {boolean}  Whether text is selected.
 */
function isTextSelected(): boolean {
    const selection = window.getSelection();
    if (selection === null) {
        return false;
    }
    return selection.toString().length > 0;
}

/**
 * Initial click handler to set up hotkeys. Detect click anywhere, but only
 * once. Don't start listening for shift and control until then. I think this is
 * to avoid issues with hotkeys being registered before the document is ready.
 */
function onInitialClick() {
    hotkeyslibPromise()
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
            // Remove the listener after it has run once.
            document.removeEventListener("click", onInitialClick);
            return;
        })
        .catch((err) => {
            throw err;
        });
}

/**
 * If user unfocuses this tab, clear shift/control hotkeys.
 */
function onWindowBlur() {
    shiftKeyDown = false;
    controlKeyDown = false;
}

/**
 * Sets up global event listeners for hotkey state management.
 * Should be called once when the application starts.
 */
export function setupGlobalKeyListeners() {
    document.addEventListener("click", onInitialClick);
    window.addEventListener("blur", onWindowBlur);
}
/**
 * Get the hotkeys object (library). If it is not yet loaded, load it.
 *
 * @returns {Promise<any>}  A promise that resolves to the hotkeys object.
 */
function hotkeyslibPromise(): Promise<any> {
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
 * @param {string | string[]}  hotkeys   The hotkeys to add.
 * @param {string}             pluginId  The plugin ID.
 * @param {Function}           callback  The function to run when the hotkey is
 *                                       pressed.
 */
export function registerHotkeys(
    hotkeys: string | string[],
    pluginId: string,
    callback: (e: KeyboardEvent) => void
) {
    const callBackWrapper = (e: KeyboardEvent) => {
        if (isTextSelected()) {
            return;
        }
        callback(e);
    };

    // If hotkeys is a string, make it an array.
    if (typeof hotkeys === "string") {
        hotkeys = [hotkeys];
    }

    // Now process/validate each of the items in hotkeys.
    for (let i = 0; i < hotkeys.length; i++) {
        const hotkey = hotkeys[i];
        if (hotkeysUsed.has(hotkey)) {
            const msg = `Two plugins are trying to use the same hotkey: ${hotkey}`;
            throw new Error(msg);
        }

        // command+ in hotkey? Throw error.
        if (hotkey.indexOf("+") !== -1) {
            const msg = `Plugin ${pluginId} has a hotkey with "+" in it. This is not allowed. Use only the letter.`;
            throw new Error(msg);
        }

        let key = hotkey.toLowerCase();
        if (key.length === 1) {
            key = `ctrl+${key}, command+${key}`;
        }

        hotkeys[i] = key;
    }

    // Now convert to a string
    hotkeys = hotkeys.join(", ");

    hotkeyslibPromise()
        .then((hotkeysLib) => {
            hotkeysUsed.add(hotkeys as string);
            hotkeysLib(hotkeys, callBackWrapper);
            return;
        })
        .catch((err) => {
            throw err;
        });
}
