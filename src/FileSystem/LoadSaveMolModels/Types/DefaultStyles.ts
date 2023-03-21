import { IStyle, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

export const unbondedAtomsStyle: IStyle = {
    sphere: {
        radius: 0.5,
    },
};

const _sphereStyle: IStyle = {
    sphere: {},
};

const _stickStyle: IStyle = {
    stick: {},
};

export const proteinStyle: IStyle[] = [
    {
        cartoon: {
            color: "spectrum",
        },
    },
];

export const nucleicStyle: IStyle[] = [_stickStyle];

export const ligandsStyle: IStyle[] = [_stickStyle];

export const metalsStyle: IStyle[] = [_sphereStyle];

export const lipidStyle: IStyle[] = [_stickStyle];

export const ionsStyle: IStyle[] = [_sphereStyle];

export const solventStyle: IStyle[] = [_stickStyle];

// Empty on purpose to satisfy typescript
const regionStyle: IStyle[] = [];

export const defaultStyles: { [key in TreeNodeType]: IStyle[] } = {
    [TreeNodeType.Protein]: proteinStyle,
    [TreeNodeType.Nucleic]: nucleicStyle,
    [TreeNodeType.Compound]: ligandsStyle,
    [TreeNodeType.Metal]: metalsStyle,
    [TreeNodeType.Lipid]: lipidStyle,
    [TreeNodeType.Ions]: ionsStyle,
    [TreeNodeType.Solvent]: solventStyle,
    [TreeNodeType.Region]: regionStyle,
};