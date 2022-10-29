import { IStyle, MolType } from "@/UI/Navigation/TreeView/TreeInterfaces";

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

export const defaultStyles: { [key in MolType]: IStyle[] } = {
    [MolType.Protein]: proteinStyle,
    [MolType.Nucleic]: nucleicStyle,
    [MolType.Compound]: ligandsStyle,
    [MolType.Metal]: metalsStyle,
    [MolType.Lipid]: lipidStyle,
    [MolType.Ions]: ionsStyle,
    [MolType.Solvent]: solventStyle,
};