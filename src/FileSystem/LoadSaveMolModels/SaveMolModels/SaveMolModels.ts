// Entry point for all the save-molecule functions except molmoda, which should
// be accessed directly.

import { compileByMolecule } from "./CompileByMolecule";
import { getConvertedTxts, getPrimaryExt, saveTxtFiles } from "./SaveMolModelsUtils";
import {
    IMolsToConsider,
    ICompiledNodes,
    ICmpdNonCmpdFileInfos,
} from "./Types";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * Compiles (organizes) all the molecules, separating compounds if appropriate.
 * As currently implemented, always merges models of the same molecule together,
 * with possible exception of compound (if so specified).
 *
 * @param  {IMolsToConsider} molsToConsider         The molecules to compile.
 * @param  {boolean}         keepCompoundsSeparate  Whether to keep compounds
 *                                                  separate. If false, they are
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
        // mol_filter_ok
        .filter((group) => group.length > 0)
        .map((nodes) =>
            // Always merging here.
            getConvertedTxts(nodes, nonCompoundTargetExt, true)
        );

    // Now do the compounds.
    let compoundPromises: Promise<FileInfo[]>[] = [];
    if (compiledNodes.compoundsNodes) {
        compoundPromises = compiledNodes.compoundsNodes.map((node) =>
            // Note that compounds never merged
            getConvertedTxts(new TreeNodeList([node]), compoundTargetExt, false)
        );
    }

    const allCompoundPromises = Promise.all(compoundPromises);
    const allNonCompoundPromises = Promise.all(nonCompoundPromises);

    return Promise.all([allCompoundPromises, allNonCompoundPromises]).then(
        (fileInfos: any[]) => {
            const compounds = fileInfos[0] as FileInfo[][];
            const nonCompounds = fileInfos[1] as FileInfo[][];

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
