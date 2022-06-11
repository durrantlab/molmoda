/* eslint-disable */

import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";

// @ts-ignore
import * as tmp from "@/UI/Viewer/3Dmol-nojquery.JDD";
const $3Dmol = tmp as any;

export function loadMolecularModelFromText(
    molText: string,
    format: string
): Promise<any> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );
    return runWorker(worker, { molText, format }).then((payload: any[]) => {

        let [organizedAtoms, treeViewData] = payload;
        // debugger;
        // Convert to a model
        const model = new $3Dmol.GLModel();
        model.addAtoms(organizedAtoms);

        store.commit("treeview/setVar", {
            name: "treeData",
            val: treeViewData
        });

        // const proteinModel = model.selectedAtoms(proteinSel);
        return model;
    });
}
