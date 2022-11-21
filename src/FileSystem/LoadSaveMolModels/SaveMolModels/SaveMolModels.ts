// Entry point for all the save-molecule functions except biotite, which should
// be accessed directly.

import { IFileInfo } from "@/FileSystem/Types";
import { compileByMolecule } from "./CompileByMolecule";
import { getConvertedTxts, getPrimaryExt, saveTxtFiles } from "./Utils";
import {
    IMolsToConsider,
    ICompiledNodes,
    ICmpdNonCmpdFileInfos,
} from "./Types";

/**
 * Compiles (organizes) all the molecules, separating compounds if appropriate.
 *
 * @param  {IMolsToConsider} molsToConsider         The molecules to compile.
 * @param  {boolean}         keepCompoundsSeparate  Whether to keep compounds
 *                                                  separate. If false, they sre
 *                                                  merged with the main
 *                                                  molecule.
 * @returns {ICompiledNodes}  The compiled nodes.
 */
export function compileMolModels(
    molsToConsider: IMolsToConsider,
    keepCompoundsSeparate: boolean
): ICompiledNodes {
    return compileByMolecule(molsToConsider, keepCompoundsSeparate);
}

/**
 * @param  {ICompiledNodes} compiledNodes      The compiled (organized) models,
 *                                             the output of compileMolModels().
 * @param  {string}         compoundFormat     The format to save compounds.
 * @param  {string}         nonCompoundFormat  The format to save non-compounds.
 * @returns {Promise<ICmpdNonCmpdFileInfos>}  The compound and
 *     non-compound file infos.
 */
export function convertCompiledMolModelsToIFileInfos(
    compiledNodes: ICompiledNodes,
    compoundFormat: string,
    nonCompoundFormat: string
): Promise<ICmpdNonCmpdFileInfos> {
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

    const allCompoundPromises = Promise.all(compoundPromises);
    const allNonCompoundPromises = Promise.all(nonCompoundPromises);

    // No need to keep them separate at this point, since conversion already
    // took place. So ...
    return Promise.all([allCompoundPromises, allNonCompoundPromises]).then(
        (fileInfos: any[]) => {
            const compounds = fileInfos[0] as IFileInfo[][];
            const nonCompounds = fileInfos[1] as IFileInfo[][];

            const compoundsFlat = compounds.reduce(
                (acc, val) => acc.concat(val),
                []
            );
            const nonCompoundsFlat = nonCompounds.reduce(
                (acc, val) => acc.concat(val),
                []
            );

            return {
                compoundFileInfos: compoundsFlat,
                nonCompoundFileInfos: nonCompoundsFlat,
            } as ICmpdNonCmpdFileInfos;
        }
    );
}

/**
 * Saves the compiled (organized) models, the output of
 * convertCompiledMolModelsToIFileInfos().
 *
 * @param  {string}                filename                      The filename to
 *                                                               save to.
 * @param  {ICmpdNonCmpdFileInfos} compoundNonCompoundFileInfos  The compound
 *                                                               and
 *                                                               non-compound
 *                                                               file infos.
 * @returns {Promise<any>}  The promise that resolves when the files are saved.
 */
export function saveMolFiles(
    filename: string,
    compoundNonCompoundFileInfos: ICmpdNonCmpdFileInfos
): Promise<any> {
    const files = [
        ...compoundNonCompoundFileInfos.compoundFileInfos,
        ...compoundNonCompoundFileInfos.nonCompoundFileInfos,
    ];
    return saveTxtFiles(files, filename);
}
