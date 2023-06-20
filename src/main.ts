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

// Make list of fake inputs, 200 random numbers
// const fakeInputs: number[] = [];
// for (let i = 0; i < 200; i++) {
//     fakeInputs.push(Math.random());
// }
// new QueueTest("test", fakeInputs, 8, 2, 10, {
//     onJobDone: (jobInfo) => {
//         console.log("Job done:", jobInfo);
//     },
//     onProgress: (progress) => {
//         console.log("Progress:", progress);
//     },
//     onQueueDone: (outputs) => {
//         console.log("Queue done:", outputs);
//     },
//     onError(jobInfos, error) {
//         console.error("Error running jobs:", jobInfos, error);
//     },
// });