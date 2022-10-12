import "mutationobserver-shim";
import { createApp } from "vue";
import App from "./App/App.vue";
import "./registerServiceWorker";
import { setupVueXStore } from "./Store";
import { loadFontAwesomeFonts } from "./UI/FontAwesome";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { jobQueueSetup } from "./JobQueue";
import { setupTests } from "./Testing/SetupTests";
import { setOnePlugin } from "./Core/OnePlugin";
import { setupWarnSaveOnClose } from "./Store/LoadAndSaveStore";

// api.sys.loadStatus.started = true;

setOnePlugin();
loadFontAwesomeFonts();
jobQueueSetup();
setupTests();
setupWarnSaveOnClose();

// api.sys.loadStatus.pluginsLoaded = true;

// console.warn("Below now meaningless?");
// api.sys.loadStatus.menuFinalized = true;
const store = setupVueXStore();
createApp(App)
    .component("font-awesome-icon", FontAwesomeIcon)
    .use(store)
    .mount("#app");
