import { library } from "@fortawesome/fontawesome-svg-core";
import { faFolder } from "@fortawesome/free-regular-svg-icons/faFolder";
import { faFile } from "@fortawesome/free-regular-svg-icons/faFile";

export function loadFontAwesomeFonts() {
    library.add(faFolder);
    library.add(faFile);
    // dom.watch();
}