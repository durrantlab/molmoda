import { library } from "@fortawesome/fontawesome-svg-core";

import { faFolder } from "@fortawesome/free-regular-svg-icons/faFolder";
import { faFile } from "@fortawesome/free-regular-svg-icons/faFile";
import { faEye } from "@fortawesome/free-regular-svg-icons/faEye";
import { faEyeSlash } from "@fortawesome/free-regular-svg-icons/faEyeSlash";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";
// import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faArrowsToEye } from "@fortawesome/free-solid-svg-icons/faArrowsToEye";


export function loadFontAwesomeFonts() {
    library.add(faFolder);
    library.add(faFile);
    library.add(faAngleDown);
    // library.add(faAngleUp);
    library.add(faAngleRight);
    library.add(faEye);
    library.add(faEyeSlash);
    library.add(faArrowsToEye);
    // dom.watch();
}