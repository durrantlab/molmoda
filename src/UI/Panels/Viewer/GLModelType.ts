/* eslint-disable @typescript-eslint/ban-types */

export interface GLModel {
    selectedAtoms: Function;
    removeAtoms: Function;
    hide: Function;
    show: Function;
    setStyle: Function;
    setClickable: Function;
    setHoverable: Function;
    id: number;
}