import { IFormOption } from "../FormFull/FormFullInterfaces";

export enum MolsToUse {
    All,
    Visible,
    Selected,
    VisibleOrSelected,
}

export const molsToUseOptions: IFormOption[] = [
    {
        description: "All Molecules (Visible, Hidden, Selected)",
        val: MolsToUse.All,
    },
    {
        description: "Visible Molecules",
        val: MolsToUse.Visible,
    },
    {
        description: "Selected Molecules",
        val: MolsToUse.Selected,
    },
    {
        description: "Visible and/or Selected Molecules",
        val: MolsToUse.VisibleOrSelected,
    },
];

export enum CombineProteinType {
    PerProtein = "PER_PROTEIN",
    MergeAll = "MERGE_ALL",
    PerChain = "PER_CHAIN",
}

export interface IMoleculeInputParams {
    combineProteinType: CombineProteinType;
    molsToUse: MolsToUse;
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
        combineProteinType: CombineProteinType.MergeAll,
        molsToUse: MolsToUse.Visible,
        considerProteins: true,
        considerCompounds: true,
    };
}
