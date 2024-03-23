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
 * @returns {Promise<TreeNode>} A promise that resolves the molecule.
 */
export async function parseMolecularModelFromTexts(
    fileInfos: FileInfo[],
    format: string
): Promise<TreeNodeList> {
    const parseMolecularModelsWorker = new Worker(
        new URL("./ParseMolecularModels.worker", import.meta.url)
    );

    try {
        const workerParams = fileInfos.map((fi) => {
            return { fileInfo: fi.serialize ? fi.serialize() : fi, format };
        }) as IMolData[];

        // molecularDataDeserialized is a pure javascript object
        const molecularDataDeserialized = await runWorker(
            parseMolecularModelsWorker,
            workerParams
        );
        
        const molecularDataNodeList = await treeNodeListDeserialize(
            molecularDataDeserialized
            );
            
        // (window as any).testing_var = {
        //     workerParams: workerParams[0].fileInfo.contents,
        //     molecularDataDeserialized: molecularDataDeserialized,
        //     molecularDataNodeList: molecularDataNodeList
        // };

        // For aspirin:
        //   Txt on disk: 
        //   molecularDataDeserialized: 6.0 KB
        //   molecularDataNodeList: 12.8 KB
        // For 1XDN:
        //   Txt on disk: 451 KB
        //   molecularDataDeserialized is 604 KB
        //   molecularDataNodeList is 877 KB.
        // For 2HU4:
        //   Txt on disk: 2.0 MB
        //   molecularDataDeserialized is 5.642 MB
        //   molecularDataNodeList is 8.602 MB

        molecularDataNodeList.forEach((molecularDatum: TreeNode) => {
            const fileName = molecularDatum.src;

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
    } finally {
        // Terminate the worker to free up resources
        parseMolecularModelsWorker.terminate();
    }
}
