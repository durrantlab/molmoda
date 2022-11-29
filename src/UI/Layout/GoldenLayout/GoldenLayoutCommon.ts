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
    return goldenLayout;
}
