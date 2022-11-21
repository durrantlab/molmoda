import { IMolsToConsider } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";

export interface IMoleculeInputParams {
    molsToConsider: IMolsToConsider;
    considerProteins: boolean;
    considerCompounds: boolean;
    proteinFormat: string;
    compoundFormat: string;
}

/**
 * Gets default molecule input parameters that can be modified/refined elsewhere.
 *
 * @returns {IMoleculeInputParams}  The default molecule input parameters.
 */
export function defaultMoleculeInputParams(): IMoleculeInputParams {
    return {
        molsToConsider: { visible: true, selected: true, hiddenAndUnselected: false } as IMolsToConsider,
        considerProteins: true,
        considerCompounds: true,
        proteinFormat: "pdb",
        compoundFormat: "mol2"
    };
}
