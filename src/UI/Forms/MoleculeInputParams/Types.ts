import { IMolsToConsider, MolMergeStrategy } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import { IFormOption } from "../FormFull/FormFullInterfaces";

// Good to do below because when using selection, val is a string. So good not
// to use object of type IMolsToConsider directly.
export enum MolsToConsiderStr {
    All = "All",
    Selected = "Selected",
    Visible = "Visible",
    VisibleOrSelected = "VisibleOrSelected",
}

// For easy converting back to IMolsToConsider.
export const molsToConsiderStrToObj: {
    [key in MolsToConsiderStr]: IMolsToConsider;
} = {
    [MolsToConsiderStr.All]: { all: true },
    [MolsToConsiderStr.Selected]: { selected: true },
    [MolsToConsiderStr.Visible]: { visible: true },
    [MolsToConsiderStr.VisibleOrSelected]: { selected: true, visible: true },
};

export function molsToConsiderToStr(
    molsToConsider: IMolsToConsider
): MolsToConsiderStr {
    if (molsToConsider.all) {
        return MolsToConsiderStr.All;
    } else if (molsToConsider.selected && molsToConsider.visible) {
        return MolsToConsiderStr.VisibleOrSelected;
    } else if (molsToConsider.selected) {
        return MolsToConsiderStr.Selected;
    } else if (molsToConsider.visible) {
        return MolsToConsiderStr.Visible;
    } else {
        // Shouldn't ever happen
        return MolsToConsiderStr.All;
    }
}

export const molsToConsiderOptions: IFormOption[] = [
    {
        description: "All Molecules (Visible, Hidden, Selected)",
        val: MolsToConsiderStr.All,
    },
    {
        description: "Visible Molecules",
        val: MolsToConsiderStr.Visible,
    },
    {
        description: "Selected Molecules",
        val: MolsToConsiderStr.Selected,
    },
    {
        description: "Visible and/or Selected Molecules",
        val: MolsToConsiderStr.VisibleOrSelected,
    },
];

export interface IMoleculeInputParams {
    molMergeStrategy: MolMergeStrategy;
    molsToConsider: IMolsToConsider;
    considerProteins: boolean;
    considerCompounds: boolean;
}

/**
 * Gets default molecule input parameters that can be modified/refined elsewhere.
 *
 * @returns {IMoleculeInputParams}  The default molecule input parameters.
 */
export function defaultMoleculeInputParams(): IMoleculeInputParams {
    return {
        molMergeStrategy: MolMergeStrategy.OneMol,
        molsToConsider: { visible: true, selected: true } as IMolsToConsider,
        considerProteins: true,
        considerCompounds: true,
    };
}
