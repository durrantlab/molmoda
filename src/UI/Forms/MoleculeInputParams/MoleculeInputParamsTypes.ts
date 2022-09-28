export enum CombineProteinType {
    PER_PROTEIN = "PER_PROTEIN",
    MERGE_ALL = "MERGE_ALL",
    PER_CHAIN = "PER_CHAIN",
}

export enum MolsToUse {
    ALL,
    VISIBLE,
    SELECTED,
    VISIBLE_OR_SELECTED,
}

export interface IMoleculeInputParams {
    combineProteinType: CombineProteinType;
    molsToUse: MolsToUse;
    considerProteins: boolean;
    considerCompounds: boolean;
}

export function defaultMoleculeInputParams(): IMoleculeInputParams {
    return {
        combineProteinType: CombineProteinType.MERGE_ALL,
        molsToUse: MolsToUse.VISIBLE,
        considerProteins: true,
        considerCompounds: true,
    };
}