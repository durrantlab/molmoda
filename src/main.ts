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

// api.sys.loadStatus.started = true;

setOnePlugin();
loadFontAwesomeFonts();
jobQueueSetup();

// api.sys.loadStatus.pluginsLoaded = true;

// console.warn("Below now meaningless?");
// api.sys.loadStatus.menuFinalized = true;
setupTests();
const store = setupVueXStore();
createApp(App)
    .component("font-awesome-icon", FontAwesomeIcon)
    .use(store)
    .mount("#app");
