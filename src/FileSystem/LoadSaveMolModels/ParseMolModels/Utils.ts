/* eslint-disable @typescript-eslint/ban-types */

import { IAtom, IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { dynamicImports } from "@/Core/DynamicImports";
import { atomsToModels, copyObjRecursively } from "../Utils";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

/**
 * Loads a molecule from text, using a web worker.
 *
 * @param  {string} molText The text of the molecule.
 * @param  {string} format  The format of the molecule.
 * @param  {string} molName The name of the molecule.
 * @returns {Promise<IMolContainer>} A promise that resolves the molecule.
 */
export function parseMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<IMolContainer[]> {
    const worker = new Worker(
        new URL("./ParseMolecularModels.worker", import.meta.url)
    );

    return runWorker(worker, { molText, format, molName })
        .then((molecularData: IMolContainer[]) => {
            const promises = molecularData.map(molecularDatum => atomsToModels(molecularDatum));
            return Promise.all(promises);
        })
        .then((molecularData: IMolContainer[]) => {
            for (const molecularDatum of molecularData) {
                // Set molName as src on all terminal nodes
                molecularDatum.src = molName;
                if (molecularDatum.nodes) {
                    getTerminalNodes(molecularDatum.nodes).forEach(
                        (node: IMolContainer) => {
                            node.src = molName;
                        }
                    );
                }
            }

            return molecularData;
        });
}

