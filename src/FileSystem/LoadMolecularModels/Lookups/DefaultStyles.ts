import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";

export const unbondedAtomsStyle: IStyle = {
    selection: { bonds: 0 },
    style: { sphere: {
        radius: 0.5
    } },
};

const sphereStyle: IStyle = {
    selection: {},
    style: {
        sphere: {},
    },
};

const stickStyle: IStyle = {
    selection: {},
    style: {
        stick: {},
    },
};

export const proteinStyle: IStyle[] = [
    {
        selection: {},
        style: {
            cartoon: {
                color: "spectrum",
            }
        },
    },
];

export const nucleicStyle: IStyle[] = [stickStyle];

export const ligandsStyle: IStyle[] = [stickStyle];

export const metalsStyle: IStyle[] = [sphereStyle];

export const lipidStyle: IStyle[] = [stickStyle];

export const ionsStyle: IStyle[] = [sphereStyle];

export const solventStyle: IStyle[] = [stickStyle];
