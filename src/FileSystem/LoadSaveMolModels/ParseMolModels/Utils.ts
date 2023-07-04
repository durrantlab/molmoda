/* eslint-disable @typescript-eslint/ban-types */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { treeNodeListDeserialize } from "@/TreeNodes/Deserializers";
import { FileInfo } from "@/FileSystem/FileInfo";
import { IMolData } from "@/Core/WebWorkers/WorkerHelper";

/**
 * Loads a molecule from text, using a web worker.
 *
 * @param  {FileInfo} fileInfos     The text and name of the molecule.
 * @param  {string}   format        The format of the molecule.
 * @param  {string}   origFilename  The original filename of the molecule
 *                                  s(before separated into frames).
 * @returns {Promise<TreeNode>} A promise that resolves the molecule.
 */
export function parseMolecularModelFromTexts(
    fileInfos: FileInfo[],
    format: string,
): Promise<TreeNodeList> {
    const parseMolecularModelsWorker = new Worker(
        new URL("./ParseMolecularModels.worker", import.meta.url)
    );

    const workerParams = fileInfos.map(fi => {
        return { fileInfo: fi.serialize ? fi.serialize() : fi, format }
    }) as IMolData[];

    return runWorker(parseMolecularModelsWorker, workerParams)
        .then((molecularDataDeserialized: any) => {
            return treeNodeListDeserialize(molecularDataDeserialized);
            // const promises = molecularDataNodeList.map(
            //     (molecularDatum: TreeNode) => atomsToModels(molecularDatum)
            // );
            // return Promise.all(promises);
        })
        .then((molecularDataNodeList: TreeNodeList) => {
            molecularDataNodeList.forEach((molecularDatum: TreeNode, idx: number) => {
                // Set name based on first one in fileInfos.
                const fileName = fileInfos[idx].name;

                // Set molName as src on all terminal nodes
                molecularDatum.src = fileName;
                const children = molecularDatum.nodes;
                if (children) {
                    children.filters.onlyTerminal.forEach((node: TreeNode) => {
                        node.src = fileName;
                    });
                }
            });

            return molecularDataNodeList;
        });
}
