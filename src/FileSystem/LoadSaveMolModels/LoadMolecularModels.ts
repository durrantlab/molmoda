/* eslint-disable @typescript-eslint/ban-ts-comment */

import { dynamicImports } from "@/Core/DynamicImports";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";
import { getAllNodesFlattened, getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

import { GLModel, IAtom, IMolContainer } from "../../UI/Navigation/TreeView/TreeInterfaces";

export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<GLModel[]> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );
    return runWorker(worker, { molText, format, molName })
    .then((molecularData: IMolContainer) => {
        return _convertAllAtomArraysToModels(molecularData)
        .then((models: GLModel[]) => {
            // Set molName as src on all terminal nodes
            molecularData.src = molName;
            if (molecularData.nodes) {
                getTerminalNodes(molecularData.nodes).forEach((node: IMolContainer) => {
                    node.src = molName;
                });
            }
            
            store.commit("pushToList", {
                name: "molecules",
                val: molecularData
            });
    
            return models;
        })
    });
}

function _convertAllAtomArraysToModels(treeViewData: IMolContainer): Promise<GLModel[]> {
    const nodesToConsider: IMolContainer[] = [];
    getAllNodesFlattened([treeViewData])
    .forEach((node: IMolContainer) => {
        if (node.model) {
            nodesToConsider.push(node);
        }
    });

    const promises: Promise<GLModel>[] = nodesToConsider.map(
        (node: IMolContainer): Promise<GLModel> => {
            return atomsToModel(node.model as IAtom[])
            .then((model: GLModel) => {
                node.model = model;
                return Promise.resolve(model);
            }
        );
    });
    
    return Promise.all(promises);
    
    // const models: any[] = [];
    // getAllNodesFlattened([treeViewData])
    // .forEach((node: IMolContainer) => {
    //     if (node.model) {
    //         const model = atomsToModel(node.model as IAtom[]);
    //         models.push(model);
    //         node.model = model;
    //     }
    // });

    // TODO: Below for debugging. Can remove it time.
    // for (const model of models) {
    //     convertToPDB(model);
    // }

    // return models;
}

export function atomsToModel(atoms: IAtom[]): Promise<GLModel> {
    return dynamicImports.mol3d.module.then(($3Dmol: any) => {
        const model = new $3Dmol.GLModel();
        model.addAtoms(atoms);
        return model;
    });
}