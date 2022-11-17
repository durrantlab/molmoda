import { ViewerParent } from "@/UI/Panels/Viewer/Viewers/ViewerParent";

let viewerObj: ViewerParent | undefined;

export const visualizationApi = {
    /**
     * Gets the molecular viewer.
     *
     * @returns {ViewerParent}  The molecular viewer.
     */
    get viewer(): ViewerParent | undefined {
        return viewerObj;
    },

    /**
     * Sets the molecular viewer.
     *
     * @param  {ViewerParent} v  The molecular viewer.
     */
    set viewer(v: ViewerParent | undefined) {
        viewerObj = v;
    },
};
