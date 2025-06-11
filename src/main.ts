// import "mutationobserver-shim";
import { createApp } from "vue";
import App from "./App/App.vue";
// import "./registerServiceWorker";
import { setupVueXStore } from "./Store";
import { loadFontAwesomeFonts } from "./UI/FontAwesome";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { setupTests } from "./Testing/SetupTests";
import {
    applySettings,
    getSettings,
} from "./Plugins/Core/Settings/LoadSaveSettings";
import { defineMakerFuncs } from "./TreeNodes/TreeNode/TreeNode";
import { errorReportingSetup } from "./Plugins/Core/ErrorReporting/ErrorReporting";
import { setupTags } from "./Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { setupSaveOnClose } from "./Core/SaveOnClose";
import { Reactor } from "./Core/Reactor";
import { logEvent } from "./Core/Analytics";
import { colorDefinitionNameToScheme } from "./Core/Styling/Colors/ColorSchemeDefinitions";
import { ISelAndStyle } from "./Core/Styling/SelAndStyleInterfaces";
import { pluginsApi } from "./Api/Plugins";
import { colorNameToHex } from "./Core/Styling/Colors/ColorUtils";

// import { getObabelFormats } from "./FileSystem/OpenBabel/OpenBabel";

// api.sys.loadStatus.started = true;

/**
 * The main function.
 */
async function main() {
    errorReportingSetup();
    loadFontAwesomeFonts();
    setupTests();
    setupSaveOnClose();
    setupTags();

    defineMakerFuncs();
    // setupUpDownTreeNav();

    // api.sys.loadStatus.pluginsLoaded = true;

    // console.warn("Below now meaningless?");
    // api.sys.loadStatus.menuFinalized = true;
    const store = setupVueXStore();
    applySettings(await getSettings());

    createApp(App)
        .component("font-awesome-icon", FontAwesomeIcon)
        .use(store)
        .mount("#app");

    // Love page load. Google analytics detects this automatically, but my
    // custom logging system does not.
    logEvent("page", "load");

    console.warn("BELOW IS PLAYING WITH REACTION")

    const t = async function() {

        const reactor = new Reactor();
        // await reactor.setup("Cl[C:1]([*:3])=O.[OH:2][*:4]>>[*:4][O:2][C:1]([*:3])=O")
        // reactor.addReactant("CC(Cl)=O", 0);
        // reactor.addReactant("OC1CCC(CC1)C(Cl)=O", 0);
        // reactor.addReactant("O[C@H]1[C@H](O)[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O", 1)
        // reactor.addReactant("CCCCCO", 1)
    
        // See https://zenodo.org/records/1209313
        await reactor.setup(
            "[#6:7][C:1](=[O:2])[O:3][#6:4]>>[#6:7][C:1]([H])([H])[O:2][H].[O:3]([H])[#6:4]"
        );
        reactor.addReactant("c1ccccc1CCCC(=O)OCCCC", 0);
        // reactor.addReactant("OC1CCC(CC1)C(Cl)=O", 0);
        // reactor.addReactant("O[C@H]1[C@H](O)[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O", 1)
        // reactor.addReactant("CCCCCO", 1)
    
        const results = reactor.runReaction();
    }
    // t();

    console.warn("CRUFT HERE! FIX!!!");

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

    // const img = await generatePoseView("", "");
}

main();
