import { IStyleAndSel } from "@/UI/Navigation/TreeView/TreeInterfaces";

export const unbondedAtomsStyle: IStyleAndSel = {
    selection: { bonds: 0 },
    style: { sphere: {
        radius: 0.5
    } },
};

const _sphereStyle: IStyleAndSel = {
    selection: {},
    style: {
        sphere: {},
    },
};

const _stickStyle: IStyleAndSel = {
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

export const nucleicStyle: IStyleAndSel[] = [_stickStyle];

export const ligandsStyle: IStyleAndSel[] = [_stickStyle];

export const metalsStyle: IStyleAndSel[] = [_sphereStyle];

export const lipidStyle: IStyleAndSel[] = [_stickStyle];

export const ionsStyle: IStyleAndSel[] = [_sphereStyle];

export const solventStyle: IStyleAndSel[] = [_stickStyle];
