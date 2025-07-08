import { ViewerParent } from "@/UI/Panels/Viewer/Viewers/ViewerParent";

let viewerObj: ViewerParent | undefined;
let viewerPromise: Promise<ViewerParent> | undefined = undefined;

export const visualizationApi = {
    /**
     * Gets the molecular viewer. In some contexts (when setting the viewer up)
     * it's better to just return undefined if it doens't exist.
     *
     * @returns {ViewerParent | undefined}  The molecular viewer, or undefined.
     */
    get viewerObj(): ViewerParent | undefined {
        return viewerObj;
    },
    /**
     * Sets the molecular viewer.
     *
     * @param  {ViewerParent} v  The molecular viewer.
     */
    set viewerObj(v: ViewerParent | undefined) {
        viewerObj = v;
    },
    /**
     * Gets a prommise that resolves the molecular viewer. The primary way to
     * get access to the viewer.
     *
     * @returns {Promise<ViewerParent>}  A promise that resolves the molecular
     *           viewer when/if it is available.
     */
    get viewer(): Promise<ViewerParent> {
        if (viewerPromise === undefined) {
            viewerPromise = new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (viewerObj !== undefined) {
                        resolve(viewerObj);
                        clearInterval(interval);
                    }
                }, 500);
            });
        }
        return viewerPromise;
    },
};
