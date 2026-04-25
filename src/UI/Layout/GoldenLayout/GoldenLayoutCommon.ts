import { localStorageSetItem } from "@/Core/LocalStorage";
import { setStoreVar } from "@/Store/StoreExternalAccess";
import { GoldenLayout, Stack, Tab } from "golden-layout";
import { layoutApi } from "@/Api/Layout";
import { isMobile } from "@/Core/GlobalVars";
export let goldenLayout: GoldenLayout;
/**
 * Removes Golden Layout's internal beforeunload listener.
 *
 * Golden Layout v2 attaches a 'beforeunload' listener in its constructor that
 * calls layout.destroy(), tearing every panel out of the DOM. Because
 * beforeunload fires *before* the user decides whether to leave the page,
 * cancelling the browser's "Leave site?" prompt leaves the app with a fully
 * destroyed layout (an empty #golden-layout div). We remove that listener so
 * the layout survives a cancelled close. When the page truly unloads, the
 * browser tears everything down regardless, so the listener has no useful
 * work to do.
 *
 * The listener is held in the private _windowUnloadListener field. If a
 * future Golden Layout version renames it, we fall back to wrapping
 * addEventListener around construction (handled by the caller).
 *
 * @param {GoldenLayout} layout  The layout instance to defuse.
 * @returns {boolean}  True if the listener was found and removed.
 */
function _removeBeforeUnloadListener(layout: GoldenLayout): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = (layout as any)._windowUnloadListener;
    if (typeof listener !== "function") {
        return false;
    }
    window.removeEventListener("beforeunload", listener);
    return true;
}
/**
 * Creates the golden layout and stores it in a global variable for reference
 * elsewhere.
 *
 * @param  {HTMLElement} glContainer The HTML container to put the golden layout
 *                                   in.
 * @returns {GoldenLayout}  The golden layout.
 */
export function makeGoldenLayout(glContainer: HTMLElement): GoldenLayout {
    goldenLayout = new GoldenLayout(glContainer);
    if (!_removeBeforeUnloadListener(goldenLayout)) {
        console.warn(
            "Golden Layout's _windowUnloadListener not found. The layout may be destroyed when the user cancels a tab-close prompt. Check for a Golden Layout version change."
        );
    }
    // (window as any).gl = goldenLayout;

    // const savedLayout = store.state.goldenLayout;
    // if (savedLayout !== null) {
    //     goldenLayout.loadLayout(savedLayout);
    // }

    // Add a double-click listener to tabs to toggle maximize/minimize
    goldenLayout.on("tabCreated", (tab: Tab) => {
        const tabElement = tab.element;
        tabElement.addEventListener("dblclick", () => {
            const parent = tab.contentItem.parent;
            // Check if the parent is a Stack, then toggle its maximized state.
            if (parent && parent.isStack) {
                (parent as Stack).toggleMaximise();
            }
        });
    });

    goldenLayout.on("stateChanged", function () {
        const state = goldenLayout.saveLayout();
        setStoreVar("goldenLayout", state);
        // Only save to local storage if a session layout is NOT active and not on mobile.
        if (!isMobile && !layoutApi.isSessionLayoutActive()) {
            localStorageSetItem("goldenLayoutState", state, undefined, false);
        }
    });

    return goldenLayout;
}
