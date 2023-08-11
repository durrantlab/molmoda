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
import { applySettings, getSettings } from "./Plugins/Core/Settings/LoadSaveSettings";
import { defineMakerFuncs } from "./TreeNodes/TreeNode/TreeNode";
import { getMoleculesFromStore } from "./Store/StoreExternalAccess";

// api.sys.loadStatus.started = true;

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

(window as any).testids = () => {
    getMoleculesFromStore().flattened.forEach((m) => {
        if (m.nodes) {
            m.nodes.forEach((n) => {
                console.log(m.id, n.parentId);
            });
        }
    });
}