/* eslint-disable */

import "mutationobserver-shim";
import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import { setupVueXStore } from "./Store";
import * as api from "./Api";
import { loadFontAwesomeFonts } from "./UI/FontAwesome";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { loadPlugins } from "./Plugins";

api.sys.loadStatus.started = true;

loadFontAwesomeFonts();
loadPlugins();

api.sys.loadStatus.pluginsLoaded = true;

api.sys.loadStatus.menuFinalized = true;

let store = setupVueXStore();
createApp(App)
    .component("font-awesome-icon", FontAwesomeIcon)
    .use(store)
    .mount("#app");

// loadMolecularModelFromText("molText", "mol2");

// const worker = new Worker(new URL('./worker', import.meta.url));
// runWorker(
//     worker,
//     'The Answer to the Ultimate Question of Life, The Universe, and Everything.'
// ).then(resp => {
//     debugger
// });

// test();
