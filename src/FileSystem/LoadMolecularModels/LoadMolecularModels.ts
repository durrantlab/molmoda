/* eslint-disable @typescript-eslint/ban-ts-comment */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";

// @ts-ignore
import * as tmp from "@/UI/Panels/Viewer/3Dmol-nojquery.JDD";
import { IAtom, IChain, IFileContents, IMolEntry, IResidue } from "../../UI/Navigation/TreeView/TreeInterfaces";
const $3Dmol = tmp as any;

export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<any[]> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );
    return runWorker(worker, { molText, format, molName }).then((molecularData: IFileContents) => {
        const models = convertAllAtomArraysToModels(molecularData);
        
        store.commit("pushToList", {
            name: "molecules",
            val: molecularData
        });

        return models;
    });
}

function convertAllAtomArraysToModels(treeViewData: IFileContents): any[] {
    const models: any[] = [];

    // Replace "atoms" with actual models.
    if (treeViewData.atoms) {
        const model = atomsToModel(treeViewData.atoms);
        models.push(model);
        treeViewData.model = model;
        delete treeViewData.atoms;
    }

    if (treeViewData.nodes) {
        treeViewData.nodes.forEach((molEntry: IMolEntry) => {
            if (molEntry.atoms) {
                const model = atomsToModel(molEntry.atoms);
                models.push(model);
                molEntry.model = model;
                delete molEntry.atoms;
            }
            if (molEntry.nodes) {
                molEntry.nodes.forEach((chain: IChain) => {
                    if (chain.atoms) {
                        const model = atomsToModel(chain.atoms);
                        models.push(model);
                        chain.model = model;
                        delete chain.atoms;
                    }

                    if (chain.nodes) {
                        chain.nodes.forEach((residue: IResidue) => {
                            if (residue.atoms) {
                                const model = atomsToModel(residue.atoms);
                                models.push(model);
                                residue.model = model;
                                delete residue.atoms;
                            }
                        });
                    }
                });
            }
        });
    }

    return models;
}

function atomsToModel(atoms: IAtom[]): any {
    const model = new $3Dmol.GLModel();
    model.addAtoms(atoms);
    return model;
}