import { library } from "@fortawesome/fontawesome-svg-core";

import { faFolder } from "@fortawesome/free-regular-svg-icons/faFolder";
import { faFile } from "@fortawesome/free-regular-svg-icons/faFile";
import { faEye } from "@fortawesome/free-regular-svg-icons/faEye";
import { faEyeSlash } from "@fortawesome/free-regular-svg-icons/faEyeSlash";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";
// import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faArrowsToEye } from "@fortawesome/free-solid-svg-icons/faArrowsToEye";
// import { faScissors } from "@fortawesome/free-solid-svg-icons/faScissors";
import { faClone } from "@fortawesome/free-regular-svg-icons/faClone";
import { faPencil } from "@fortawesome/free-solid-svg-icons/faPencil";
import { faRectangleXmark } from "@fortawesome/free-regular-svg-icons/faRectangleXmark";
import { faSort } from "@fortawesome/free-solid-svg-icons/faSort";
import { faSortDown } from "@fortawesome/free-solid-svg-icons/faSortDown";
import { faSortUp } from "@fortawesome/free-solid-svg-icons/faSortUp";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons/faMagnifyingGlass";
/**
 * Load the font awesome icons.
 */
export function loadFontAwesomeFonts() {
    library.add(faFolder);
    library.add(faFile);
    library.add(faAngleDown);
    // library.add(faAngleUp);
    library.add(faAngleRight);
    library.add(faEye);
    library.add(faEyeSlash);
    library.add(faArrowsToEye);
    // library.add(faScissors);
    library.add(faClone);
    library.add(faPencil);
    library.add(faRectangleXmark);
    // dom.watch();
    library.add(faSort);
    library.add(faSortDown);
    library.add(faSortUp);
    library.add(faMagnifyingGlass);
}