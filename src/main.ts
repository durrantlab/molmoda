// import "mutationobserver-shim";
import { createApp } from "vue";
import App from "./App/App.vue";
import "./registerServiceWorker";
import { setupVueXStore } from "./Store";
import { loadFontAwesomeFonts } from "./UI/FontAwesome";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { jobQueueSetup } from "./Queue/JobQueue";
import { setupTests } from "./Testing/SetupTests";
import { setOnePluginMode } from "./Core/OnePluginMode";
import { setupWarnSaveOnClose } from "./Store/LoadAndSaveStore";
import { applySettings, getSettings } from "./Plugins/Core/Settings/LoadSaveSettings";
import { defineMakerFuncs } from "./TreeNodes/TreeNode/TreeNode";

// api.sys.loadStatus.started = true;

setOnePluginMode();
loadFontAwesomeFonts();
jobQueueSetup();
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

// // eslint-disable-next-line promise/catch-or-return
// dynamicImports.rdkitjs.module.then((mod: any) => {
//     debugger;
//     return;
// });

// setTimeout(() => {
//     // eslint-disable-next-line promise/catch-or-return
//     dynamicImports.rdkitjs.module.then((mod: any) => {
//         debugger;
//         return;
//     });
// }, 15000);


// obTest();