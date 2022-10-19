/* eslint-disable @typescript-eslint/ban-types */

import { GLModel, IAtom, IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { dynamicImports } from "@/Core/DynamicImports";
import { copyObjRecursively } from "../Utils";

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
): Promise<IMolContainer> {
    const worker = new Worker(
        new URL("./ParseMolecularModels.worker", import.meta.url)
    );

    return runWorker(worker, { molText, format, molName })
        .then((molecularData: IMolContainer) => {
            return atomsToModels(molecularData);
        })
        .then((molecularData: IMolContainer) => {
            // Set molName as src on all terminal nodes
            molecularData.src = molName;
            if (molecularData.nodes) {
                getTerminalNodes(molecularData.nodes).forEach(
                    (node: IMolContainer) => {
                        node.src = molName;
                    }
                );
            }

            return molecularData;
        });
}

/**
 * Given an IMolContainer with models specifies as IAtom[], convert the models
 * to GLModel.
 *
 * @param  {IMolContainer} molContainer The IMolContainer to convert.
 * @returns {Promise<IMolContainer>} The converted IMolContainer.
 */
export function atomsToModels(
    molContainer: IMolContainer
): Promise<IMolContainer> {
    const recurseResult = copyObjRecursively({
        obj: molContainer,
        modelFunc: (
            origNode: IMolContainer,
            newNode: IMolContainer
        ): Promise<void> => {
            return _atomsToModel(origNode.model as IAtom[]).then(
                (model: GLModel) => {
                    newNode.model = model;
                    return;
                }
            );
        },
    });

    return Promise.all(recurseResult.promises).then(() => {
        return recurseResult.newNode;
    });
}

/**
 * Given an array of IAtom, convert the array to a GLModel.
 *
 * @param  {IAtom[]} atoms The array of IAtom to convert.
 * @returns {Promise<GLModel>} The converted GLModel.
 */
function _atomsToModel(atoms: IAtom[]): Promise<GLModel> {
    return dynamicImports.mol3d.module.then(($3Dmol: any) => {
        const model = new $3Dmol.GLModel();
        model.addAtoms(atoms);
        return model;
    });
}
