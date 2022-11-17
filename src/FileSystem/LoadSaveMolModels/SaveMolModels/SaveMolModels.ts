// Entry point for all the save-molecule functions except biotite, which should
// be accessed directly.

import { IFileInfo } from "@/FileSystem/Types";
import { compileOneMol } from "./CompileOneMol";
import { compileByChain } from "./CompileByChain";
import { compileByMolecule } from "./CompileByMolecule";
import { getConvertedTxts, getPrimaryExt, saveTxtFiles } from "./Utils";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface ISaveMolModelsParams {
    molMergeStrategy: MolMergeStrategy;
    molsToConsider: IMolsToConsider;
    filename?: string;
    nonCompoundFormat: string;
    compoundFormat?: string;
}

export enum MolMergeStrategy {
    OneMol = "OneMol", // Merge everything into one molecule
    ByMolecule = "ByMolecule", // Merge chains of the same molecule
    ByChain = "ByChain", // Don't merge anything
}

export interface IMolsToConsider {
    all?: boolean;
    visible?: boolean;
    selected?: boolean;
}

export interface ICompiledNodes {
    // Non-compound nodes could be grouped by molecule. If not, will be a list
    // of only one item.
    nodeGroups: IMolContainer[][];

    // Compound nodes, if given, will always be per compound.
    compoundsNodes?: IMolContainer[];

    // Used if the merge strategy is onemol.
    // allNodes?: IMolContainer[];
}

function _addDefaults(params: ISaveMolModelsParams): ISaveMolModelsParams {
    // Set some default parameters
    const defaultParams: { [key: string]: any } = {};
    if (params.molsToConsider === undefined) {
        defaultParams.molsToConsider = {
            all: true,
        };
    }

    if (params.compoundFormat === undefined) {
        defaultParams.ligandFormat = params.nonCompoundFormat;
    }

    params = { ...defaultParams, ...params } as ISaveMolModelsParams;
    return params;
}

export function compileMolModels(
    molMergeStrategy: MolMergeStrategy,
    molsToConsider: IMolsToConsider,
    keepCompoundsSeparate: boolean
): ICompiledNodes {
    // _validateSaveMolModelsParams(params);
    // params = _addDefaults(params);

    // Do a little validation.
    if (
        molsToConsider.all === true &&
        (molsToConsider.visible === true || molsToConsider.selected === true)
    ) {
        throw new Error(
            "Can't save all and save visible or selected because all includes both visible and selected."
        );
    }

    switch (molMergeStrategy) {
        case MolMergeStrategy.OneMol:
            // Here need to pass filename, because we're saving all in one file.
            return compileOneMol(molsToConsider, keepCompoundsSeparate);
        case MolMergeStrategy.ByMolecule:
            return compileByMolecule(molsToConsider, keepCompoundsSeparate);
        default:
            // By chain is only one left.
            return compileByChain(molsToConsider, keepCompoundsSeparate);
    }
}

export function convertCompiledMolModelsToIFileInfos(
    compiledNodes: ICompiledNodes,
    compoundFormat: string,
    nonCompoundFormat: string,
    useOneMolMergeStrategy?: boolean,
    filename?: string
): Promise<IFileInfo[]> {
    const compoundTargetExt = getPrimaryExt(compoundFormat);
    const nonCompoundTargetExt = getPrimaryExt(nonCompoundFormat);

    let nonCompoundPromises: Promise<IFileInfo[]>[] = [];

    if (useOneMolMergeStrategy === true) {
        // If filename is given, you're using the onemol merge strategy.

        // Quick validation.
        if (
            compoundFormat !== nonCompoundFormat &&
            (!compiledNodes.compoundsNodes ||
                compiledNodes.compoundsNodes.length === 0)
        ) {
            throw new Error(
                "Can't save all compounds and non-compounds in one molecule when compound and non-comound are in different formats."
            );
        }

        // Using onemol merge strategy. There's only one noncompound group
        // (merged).
        nonCompoundPromises = [
            getConvertedTxts(
                compiledNodes.nodeGroups
                    ? (compiledNodes.nodeGroups[0] as IMolContainer[])
                    : [],
                nonCompoundFormat,
                true, // Merge everything into one
                filename // Only needed if using onemol strategy.
            ),
        ];
    } else {
        // Not the onemol strategy. There could be multiple noncompound groups.
        // Convert them separately.
        nonCompoundPromises = compiledNodes.nodeGroups.map((nodes) =>
            // Always merging here, but in case of perr chain merging strategy,
            // will only be one terminal node anyway.
            getConvertedTxts(nodes, nonCompoundTargetExt, true)
        );
    }

    // Now do the compounds, which don't depend on the merge strategy. (If they
    // are merged together with the non-compounds, compiledNodes.compoundsNodes
    // will be empty.)
    let compoundPromises: Promise<IFileInfo[]>[] = [];
    if (compiledNodes.compoundsNodes) {
        compoundPromises = compiledNodes.compoundsNodes.map((node) =>
            // Note that compounds never merged (TODO: for now, anyway).
            getConvertedTxts([node], compoundTargetExt, false)
        );
    }

    // No need to keep them separate at this point, since conversion already
    // took place. So ...
    return Promise.all([...compoundPromises, ...nonCompoundPromises]).then(
        (fileInfos: IFileInfo[][]) => {
            // Flatten the array.
            return fileInfos.reduce((acc, val) => acc.concat(val), []);
        }
    );

    // // Start by assuming molecules should not be merged into one. This is in
    // // fact the case unless the merge strategy is onemol, or the merge strategy
    // // is by molecule and it's not a compound (merging protein chains).
    // let merge = false;

    // if (
    //     mergeMolStrategy === MolMergeStrategy.OneMol ||
    //     (mergeMolStrategy === MolMergeStrategy.ByMolecule && !isCompound)
    // ) {
    //     // If merging strategy is one mol, then we need to merge everything
    //     // (even compounds).
    //     merge = true;
    // }

    // const targetExt = getPrimaryExt(format);

    // return getConvertedTxts(
    //     molContainers,
    //     targetExt,
    //     merge,
    //     filename // Only needed if using onemol strategy.
    // );
}

export function saveMolFiles(
    filename: string,
    files: IFileInfo[]
): Promise<any> {
    return saveTxtFiles(files, filename);
}
