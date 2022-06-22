let viewerObj: any;

export const visualizationApi = {
    get viewer(): any {
        return viewerObj;
    },
    set viewer(v: any) {
        viewerObj = v;
    }
}