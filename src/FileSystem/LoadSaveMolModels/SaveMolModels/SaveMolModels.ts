// Entry point for all the save-molecule functions except biotite, which should
// be accessed directly.

import { IFileInfo } from "@/FileSystem/Types";
import { compileByMolecule } from "./CompileByMolecule";
import { getConvertedTxts, getPrimaryExt, saveTxtFiles } from "./Utils";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface ISaveMolModelsParams {
    molsToConsider: IMolsToConsider;
    filename?: string;
    nonCompoundFormat: string;
    compoundFormat?: string;
}

export interface IMolsToConsider {
    hiddenAndUnselected?: boolean;
    visible?: boolean;
    selected?: boolean;
}

export interface ICompiledNodes {
    // Non-compound nodes could be grouped by molecule. If not, will be a list
    // of only one item.
    nodeGroups: IMolContainer[][];

    // Compound nodes, if given, will always be per compound.
    compoundsNodes?: IMolContainer[];
}

function _addDefaults(params: ISaveMolModelsParams): ISaveMolModelsParams {
    // Set some default parameters
    const defaultParams: { [key: string]: any } = {};
    if (params.molsToConsider === undefined) {
        defaultParams.molsToConsider = {
            visible: true,
            selected: true,
        } as IMolsToConsider;
    }

    if (params.compoundFormat === undefined) {
        defaultParams.ligandFormat = params.nonCompoundFormat;
    }

    params = { ...defaultParams, ...params } as ISaveMolModelsParams;
    return params;
}

export function compileMolModels(
    molsToConsider: IMolsToConsider,
    keepCompoundsSeparate: boolean
): ICompiledNodes {
    // _validateSaveMolModelsParams(params);
    // params = _addDefaults(params);

    return compileByMolecule(molsToConsider, keepCompoundsSeparate);
}

export function convertCompiledMolModelsToIFileInfos(
    compiledNodes: ICompiledNodes,
    compoundFormat: string,
    nonCompoundFormat: string,
): Promise<IFileInfo[]> {
    const compoundTargetExt = getPrimaryExt(compoundFormat);
    const nonCompoundTargetExt = getPrimaryExt(nonCompoundFormat);

    // There could be multiple noncompound groups. Convert them separately.
    const nonCompoundPromises = compiledNodes.nodeGroups
        .filter((group) => group.length > 0)
        .map((nodes) =>
            // Always merging here.
            getConvertedTxts(nodes, nonCompoundTargetExt, true)
        );

    // Now do the compounds.
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
}

export function saveMolFiles(
    filename: string,
    files: IFileInfo[]
): Promise<any> {
    return saveTxtFiles(files, filename);
}
