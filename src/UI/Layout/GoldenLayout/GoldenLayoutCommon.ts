import { store } from "@/Store";
import { setStoreVar } from "@/Store/StoreExternalAccess";
import { GoldenLayout } from "golden-layout";

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
    //     debugger
    // }

    goldenLayout.on( 'stateChanged', function(){
        const state = goldenLayout.saveLayout();
        setStoreVar( 'goldenLayout', state );
    });

    return goldenLayout;
}
