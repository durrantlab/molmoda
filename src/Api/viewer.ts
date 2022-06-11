let viewerObj: any;

export const viewerApi = {
    get viewer(): any {
        return viewerObj;
    },
    set viewer(v: any) {
        viewerObj = v;
    }
}