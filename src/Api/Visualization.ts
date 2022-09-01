let viewerObj: any;

export const visualizationApi = {
    /**
     * Gets the 3dmoljs viewer.
     * 
     * @returns {any}  The 3dmoljs viewer.
     */
    get viewer(): any {
        return viewerObj;
    },
    /**
     * Sets the 3dmoljs viewer.
     * 
     * @param  {any} v  The 3dmoljs viewer.
     */
    set viewer(v: any) {
        viewerObj = v;
    }
}