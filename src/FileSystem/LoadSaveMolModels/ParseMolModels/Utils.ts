/* eslint-disable @typescript-eslint/ban-types */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { treeNodeListDeserialize } from "@/TreeNodes/Deserializers";

/**
 * Loads a molecule from text, using a web worker.
 *
 * @param  {string} molText The text of the molecule.
 * @param  {string} format  The format of the molecule.
 * @param  {string} molName The name of the molecule.
 * @returns {Promise<TreeNode>} A promise that resolves the molecule.
 */
export function parseMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<TreeNodeList> {
    const worker = new Worker(
        new URL("./ParseMolecularModels.worker", import.meta.url)
    );

    return runWorker(worker, { molText, format, molName })
        .then((molecularDataDeserialized: any) => {
            return treeNodeListDeserialize(molecularDataDeserialized);
            // const promises = molecularDataNodeList.map(
            //     (molecularDatum: TreeNode) => atomsToModels(molecularDatum)
            // );
            // return Promise.all(promises);
        })
        .then((molecularDataNodeList: TreeNodeList) => {
            molecularDataNodeList.forEach((molecularDatum: TreeNode) => {
                // Set molName as src on all terminal nodes
                molecularDatum.src = molName;
                const children = molecularDatum.nodes;
                if (children) {
                    children.filters.onlyTerminal.forEach((node: TreeNode) => {
                        node.src = molName;
                    });
                }
            });

            return molecularDataNodeList;
        });
}
