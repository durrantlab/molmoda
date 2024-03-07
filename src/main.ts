// import "mutationobserver-shim";
import { createApp } from "vue";
import App from "./App/App.vue";
// import "./registerServiceWorker";
import { setupVueXStore } from "./Store";
import { loadFontAwesomeFonts } from "./UI/FontAwesome";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { setupTests } from "./Testing/SetupTests";
import { setOnePluginMode } from "./Core/OnePluginMode";
import { setupWarnSaveOnClose } from "./Store/LoadAndSaveStore";
import {
    applySettings,
    getSettings,
} from "./Plugins/Core/Settings/LoadSaveSettings";
import { defineMakerFuncs } from "./TreeNodes/TreeNode/TreeNode";
import { errorReportingSetup } from "./Plugins/Core/ErrorReporting/ErrorReporting";
// import { getObabelFormats } from "./FileSystem/OpenBabel/OpenBabel";

// api.sys.loadStatus.started = true;

/**
 * The main function.
 */
async function main() {
    errorReportingSetup();
    setOnePluginMode();
    loadFontAwesomeFonts();
    setupTests();
    setupWarnSaveOnClose();

    defineMakerFuncs();

    // api.sys.loadStatus.pluginsLoaded = true;

    // console.warn("Below now meaningless?");
    // api.sys.loadStatus.menuFinalized = true;
    const store = setupVueXStore();

    applySettings(getSettings());

    createApp(App)
        .component("font-awesome-icon", FontAwesomeIcon)
        .use(store)
        .mount("#app");

    // getObabelFormats();

    // For debugging...
    // (window as any).testids = () => {
    //     getMoleculesFromStore().flattened.forEach((m) => {
    //         if (m.nodes) {
    //             m.nodes.forEach((n) => {
    //                 console.log(m.id, n.parentId);
    //             });
    //         }
    //     });
    // }

    // setTimeout(() => {
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     throw new Error("Test error");
    //     // api.messages.popupMessage(
    //     //     "Job Running",
    //     //     "Your job is currently running. Check the Jobs panel to monitor job progress.",
    //     //     PopupVariant.Danger
    //     // );
    // }, 3000);

    // setTimeout(() => {
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     throw new Error("Test error2");
    //     // api.messages.popupMessage(
    //     //     "Job Running",
    //     //     "Your job is2 currently running. Check the Jobs panel to monitor job progress.",
    //     //     PopupVariant.Danger
    //     // );
    // }, 6000);

    // api.messages.popupError(
    //     "<p>The following compile errors were found:</p><ul><li>" +
    //         compileErrorsArray.join("</li><li>") +
    //         "</li></ul>"
    // );
}

main();
