// Entry point for all the save-molecule functions except molmoda, which should
// be accessed directly.

import { compileByMolecule } from "./CompileByMolecule";
import { saveTxtFiles, getConvertedTxtsWithNaming } from "./SaveMolModelsUtils";
import {
    IMolsToConsider,
    ICompiledNodes,
    ICmpdNonCmpdFileInfos,
} from "./Types";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * Compiles (organizes) all the molecules.
 *
 * @param  {IMolsToConsider} molsToConsider   The molecules to compile.
 * @param  {boolean}   separateComponents     Whether to separate components.
 * @returns {ICompiledNodes}  The compiled nodes.
 */
export function compileMolModels(
    molsToConsider: IMolsToConsider,
 separateComponents: boolean
): ICompiledNodes {
 return compileByMolecule(molsToConsider, separateComponents);
}

/**
 * Converts compiled models to file infos.
 *
 * @param  {ICompiledNodes} compiledNodes   The compiled models.
 * @param  {{ [key in TreeNodeType]?: string }}   formats  Map of formats for each component type.
 * @param  {string} fallbackFormat Format to use if specific type not in map (or for mixed).
 * @returns {Promise<ICmpdNonCmpdFileInfos>}  The file infos.
 */
export function convertCompiledMolModelsToIFileInfos(
    compiledNodes: ICompiledNodes,
 formats: { [key in TreeNodeType]?: string },
 fallbackFormat: string
): Promise<ICmpdNonCmpdFileInfos> {
 
 const allPromises: Promise<FileInfo[]>[] = [];

 compiledNodes.byType.forEach((nodeGroups, type) => {
  const format = formats[type] || fallbackFormat;
  
  nodeGroups.forEach(group => {
      // Always merge the group into one file.
      allPromises.push(getConvertedTxtsWithNaming(group, format, true, type));
  });
 });

 return Promise.all(allPromises).then((results) => {
  const flat = results.reduce((acc, val) => acc.concat(val), []);
  // Populate legacy fields for compatibility if needed, though flat list is usually sufficient for saving
  const compoundFileInfos = flat.filter(f => f.name.includes("Compound")); 
  const nonCompoundFileInfos = flat.filter(f => !f.name.includes("Compound"));

  return { 
      allFileInfos: flat,
      compoundFileInfos,
      nonCompoundFileInfos
  };
 });
}

/**
 * Saves the compiled models.
 *
 * @param  {string}    filename       The filename to save to.
 * @param  {ICmpdNonCmpdFileInfos} infos  The file infos.
 * @returns {Promise<any>}  The promise.
 */
export function saveMolFiles(
    filename: string,
 infos: ICmpdNonCmpdFileInfos
): Promise<any> {
 return saveTxtFiles(infos.allFileInfos, filename);
}
