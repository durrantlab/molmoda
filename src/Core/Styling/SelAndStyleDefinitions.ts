import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ISelAndStyle } from "./SelAndStyleInterfaces";
import { colorDefinitionNameToScheme } from "./Colors/ColorSchemeDefinitions";
import { metalSel } from "@/FileSystem/LoadSaveMolModels/Types/ComponentSelections";

export const unbondedAtomsStyle: ISelAndStyle = {
    // Bond-less non-metal atoms (lone ions, disconnected atoms). Kept as small
    // fixed-radius spheres so they read as dots in line/stick views.
    selection: {
        bonds: 0,
        not: { elem: metalSel.elem },
    },
    sphere: {
        radius: 0.5,
    },
};

export const unbondedMetalsStyle: ISelAndStyle = {
    // Bond-less metal atoms render at their per-element van der Waals radius (no
    // fixed radius), matching the dedicated Metals styling.
    selection: {
        bonds: 0,
        elem: metalSel.elem,
    },
    sphere: {},
};

const _sphereStyle: ISelAndStyle = {
    // NOTE: Proteins, metals, etc. are separated into different molecules, so
    // no need to select by residue name, for example. Each style will apply to
    // all atoms in the given molecule.
    selection: {},
    sphere: {},
};

const _stickStyle: ISelAndStyle = {
    // NOTE: Proteins, metals, etc. are separated into different molecules, so
    // no need to select by residue name, for example. Each style will apply to
    // all atoms in the given molecule.
    selection: {},
    stick: { colorscheme: "default" },
};

export const defaultProteinStyle: ISelAndStyle[] = [
    {
        // NOTE: Proteins, metals, etc. are separated into different molecules, so
        // no need to select by residue name, for example. Each style will apply to
        // all atoms in the given molecule.
        selection: {},

        // Not sure why you need to specify color here and not for default
        // styles.
        cartoon: colorDefinitionNameToScheme("Spectrum", ""),
    },
];

export const defaultNucleicStyle: ISelAndStyle[] = [_stickStyle];

export const defaultLigandsStyle: ISelAndStyle[] = [_stickStyle];

export const defaultMetalsStyle: ISelAndStyle[] = [_sphereStyle];

export const defaultLipidStyle: ISelAndStyle[] = [_stickStyle];

export const defaultIonsStyle: ISelAndStyle[] = [_sphereStyle];

export const defaultSolventStyle: ISelAndStyle[] = [_stickStyle];

// export const defaultOtherStyle: IStyle[] = [_sphereStyle];

// Empty on purpose to satisfy typescript
const regionStyle: ISelAndStyle[] = [];

// This is used to restore original styling, for example after hiding a
// representation and then bringing it back.
export const defaultStyles: { [key in TreeNodeType]: ISelAndStyle[] } = {
    [TreeNodeType.Protein]: defaultProteinStyle,
    [TreeNodeType.Nucleic]: defaultNucleicStyle,
    [TreeNodeType.Compound]: defaultLigandsStyle,
    [TreeNodeType.Metal]: defaultMetalsStyle,
    [TreeNodeType.Lipid]: defaultLipidStyle,
    [TreeNodeType.Ions]: defaultIonsStyle,
    [TreeNodeType.Solvent]: defaultSolventStyle,
    [TreeNodeType.Region]: regionStyle,
    [TreeNodeType.Other]: [], // Must be defined explicitly (TreeNode.styles = [{...}])
};
