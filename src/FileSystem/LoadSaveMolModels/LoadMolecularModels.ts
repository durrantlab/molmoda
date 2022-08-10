/* eslint-disable @typescript-eslint/ban-ts-comment */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";
import { getAllNodesFlattened, getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

// @ts-ignore
import * as tmp from "@/UI/Panels/Viewer/3Dmol-nojquery.JDD";
import { IAtom, IMolContainer, IResidue } from "../../UI/Navigation/TreeView/TreeInterfaces";
const $3Dmol = tmp as any;

export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<any[]> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );
    return runWorker(worker, { molText, format, molName })
    .then((molecularData: IMolContainer) => {
        const models = _convertAllAtomArraysToModels(molecularData);

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
    });
}

function _convertAllAtomArraysToModels(treeViewData: IMolContainer): any[] {
    const models: any[] = [];
    getAllNodesFlattened([treeViewData])
    .forEach((node: IMolContainer) => {
        if (node.model) {
            const model = atomsToModel(node.model as IAtom[]);
            models.push(model);
            node.model = model;
        }
    });

    // TODO: Below for debugging. Can remove it time.
    // for (const model of models) {
    //     convertToPDB(model);
    // }

    return models;
}

export function atomsToModel(atoms: IAtom[]): any {
    const model = new $3Dmol.GLModel();
    model.addAtoms(atoms);
    return model;
}