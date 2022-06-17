import { library } from "@fortawesome/fontawesome-svg-core";

import { faFolder } from "@fortawesome/free-regular-svg-icons/faFolder";
import { faFile } from "@fortawesome/free-regular-svg-icons/faFile";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";


export function loadFontAwesomeFonts() {
    library.add(faFolder);
    library.add(faFile);
    library.add(faAngleDown);
    library.add(faAngleRight);
    // dom.watch();
}