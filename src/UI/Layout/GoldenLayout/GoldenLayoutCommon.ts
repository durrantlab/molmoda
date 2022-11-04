import { GoldenLayout } from "golden-layout";

export let goldenLayout: GoldenLayout;

export function makeGoldenLayout(glContainer: HTMLElement): GoldenLayout {
    goldenLayout = new GoldenLayout(glContainer);
    return goldenLayout;
}