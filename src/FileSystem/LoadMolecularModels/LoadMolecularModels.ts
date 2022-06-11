/* eslint-disable */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";

// @ts-ignore
import * as tmp from "@/UI/Viewer/3Dmol-nojquery.JDD";
import { IAtom, IChain, IFileContents, IMolEntry, IResidue } from "./ModelInterfaces";
const $3Dmol = tmp as any;

export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<any> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );
    return runWorker(worker, { molText, format, molName }).then((treeViewData: IFileContents) => {

        // let [organizedAtoms, treeViewData] = payload;
        // debugger;
        // Convert to a model
        // const model = new $3Dmol.GLModel();
        // model.addAtoms(organizedAtoms);

        let models = convertAllAtomArraysToModels(treeViewData);

        store.commit("treeview/setVar", {
            name: "treeData",
            val: [treeViewData]
        });

        // debugger;

        // const proteinModel = model.selectedAtoms(proteinSel);
        return models;
    });
}

function convertAllAtomArraysToModels(treeViewData: IFileContents): any[] {
    let models: any[] = [];

    // Replace "atoms" with actual models.
    if (treeViewData.atoms) {
        let model = atomsToModel(treeViewData.atoms);
        models.push(model);
        treeViewData.model = model;
        delete treeViewData.atoms;
    }

    if (treeViewData.nodes) {
        treeViewData.nodes.forEach((molEntry: IMolEntry) => {
            if (molEntry.atoms) {
                let model = atomsToModel(molEntry.atoms);
                models.push(model);
                molEntry.model = model;
                delete molEntry.atoms;
            }
            if (molEntry.nodes) {
                molEntry.nodes.forEach((chain: IChain) => {
                    if (chain.atoms) {
                        let model = atomsToModel(chain.atoms);
                        models.push(model);
                        chain.model = model;
                        delete chain.atoms;
                    }

                    if (chain.nodes) {
                        chain.nodes.forEach((residue: IResidue) => {
                            if (residue.atoms) {
                                let model = atomsToModel(residue.atoms);
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