import "mutationobserver-shim";
import { createApp } from "vue";
import App from "./App/App.vue";
import "./registerServiceWorker";
import { setupVueXStore } from "./Store";
import * as api from "./Api";
import { loadFontAwesomeFonts } from "./UI/FontAwesome";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { jobQueueSetup } from "./JobQueue";

api.sys.loadStatus.started = true;

loadFontAwesomeFonts();
jobQueueSetup();

api.sys.loadStatus.pluginsLoaded = true;

console.warn("Below now meaningless?");
api.sys.loadStatus.menuFinalized = true;

const store = setupVueXStore();
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
