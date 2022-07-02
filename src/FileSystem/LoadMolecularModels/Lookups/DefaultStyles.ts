import { IStyleAndSel } from "@/UI/Navigation/TreeView/TreeInterfaces";

export const unbondedAtomsStyle: IStyleAndSel = {
    selection: { bonds: 0 },
    style: { sphere: {
        radius: 0.5
    } },
};

const sphereStyle: IStyleAndSel = {
    selection: {},
    style: {
        sphere: {},
    },
};

const stickStyle: IStyleAndSel = {
    selection: {},
    style: {
        stick: {},
    },
};

export const proteinStyle: IStyleAndSel[] = [
    {
        selection: {},
        style: {
            cartoon: {
                color: "spectrum",
            }
        },
    },
];

export const nucleicStyle: IStyleAndSel[] = [stickStyle];

export const ligandsStyle: IStyleAndSel[] = [stickStyle];

export const metalsStyle: IStyleAndSel[] = [sphereStyle];

export const lipidStyle: IStyleAndSel[] = [stickStyle];

export const ionsStyle: IStyleAndSel[] = [sphereStyle];

export const solventStyle: IStyleAndSel[] = [stickStyle];
