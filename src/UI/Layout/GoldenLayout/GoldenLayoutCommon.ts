import { localStorageSetItem } from "@/Core/LocalStorage";
import { setStoreVar } from "@/Store/StoreExternalAccess";
import { GoldenLayout, Stack, Tab } from "golden-layout";
import { layoutApi } from "@/Api/Layout";
export let goldenLayout: GoldenLayout;

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
        // Only save to local storage if a session layout is NOT active.
        if (!layoutApi.isSessionLayoutActive()) {
            localStorageSetItem("goldenLayoutState", state, undefined, false);
        }
    });

    return goldenLayout;
}
