import { IStyle } from "@/UI/TreeView/TreeInterfaces";

const unbondedAtoms: IStyle = {
    selection: { bonds: 0 },
    style: { sphere: {} },
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
    unbondedAtoms,
    {
        selection: {},
        style: {
            cartoon: {
                color: "spectrum",
            },
        },
    },
];

export const nucleicStyle: IStyle[] = [stickStyle, unbondedAtoms];

export const ligandsStyle: IStyle[] = [stickStyle, unbondedAtoms];

export const metalsStyle: IStyle[] = [sphereStyle, unbondedAtoms];

export const lipidStyle: IStyle[] = [stickStyle, unbondedAtoms];

export const ionsStyle: IStyle[] = [sphereStyle, unbondedAtoms];

export const solventStyle: IStyle[] = [stickStyle, unbondedAtoms];
