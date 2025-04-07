import { setupBeforeUnload } from "./BeforeUnload";
// import { setupExitIntent } from "./ExitIntent";

/**
 * Sets up the app so a dialog will appear when the user tries to close the
 * window, warning them they should save their work.
 */
export async function setupSaveOnClose() {
    setupBeforeUnload();

    // TODO: This is annoying. Decided not to use, but keep it commented now.
    // await setupExitIntent();
}
