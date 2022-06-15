/* eslint-disable */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";

// @ts-ignore
import * as tmp from "@/UI/Viewer/3Dmol-nojquery.JDD";
import { IAtom, IChain, IFileContents, IMolEntry, IResidue } from "../../UI/TreeView/TreeInterfaces";
const $3Dmol = tmp as any;

export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<any> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );
    return runWorker(worker, { molText, format, molName }).then((payload: any[]) => {

        let treeViewData: IFileContents = payload[0];
        let models = convertAllAtomArraysToModels(treeViewData);
        // debugger;
        store.commit("treeview/pushToList", {
            name: "treeData",
            val: treeViewData
        });

        // You need to be able to map model ids to the model data quickly (e.g.,
        // for clicking on the tree view). Let's build that index here.
        let pathsAndIds: any[] = payload[1];
        let idsToLeafs: {[key:string]: any} = {};
        pathsAndIds.forEach((pathAndId: any) => {
            let path: number[] = pathAndId[0];
            let id: string = pathAndId[1];
            if (!treeViewData.nodes) { return; }
            let leaf = treeViewData.nodes[path[0]];
            for (let i = 1; i < path.length; i++) {
                let idx: number = path[i];
                if (!leaf.nodes) { return; }
                leaf = leaf.nodes[idx];
            }
            idsToLeafs[id] = leaf;
        });

        store.commit("treeview/addToObj", {
            name: "idToLeaf",
            val: idsToLeafs
        });

        setTimeout(() => {
            for (let id in idsToLeafs) {
                let leaf = idsToLeafs[id] as IMolEntry;
                leaf.styles = [{selection: {}, style: {}}]
            }
            console.log("moo");
        }, 5000);

        // let [organizedAtoms, treeViewData] = payload;
        // debugger;
        // Convert to a model
        // const model = new $3Dmol.GLModel();
        // model.addAtoms(organizedAtoms);

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