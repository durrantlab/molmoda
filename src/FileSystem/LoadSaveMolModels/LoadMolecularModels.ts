/* eslint-disable @typescript-eslint/ban-ts-comment */

import { dynamicImports } from "@/Core/DynamicImports";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { store } from "@/Store";
import { getAllNodesFlattened, getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";

import { GLModel, IAtom, IMolContainer } from "../../UI/Navigation/TreeView/TreeInterfaces";
import { atomsToModels } from "./MolsToFromJSON";

export function loadMolecularModelFromText(
    molText: string,
    format: string,
    molName: string
): Promise<IMolContainer> {
    const worker = new Worker(
        new URL("./LoadMolecularModels.worker", import.meta.url)
    );

    return runWorker(worker, { molText, format, molName })
    .then((molecularData: IMolContainer) => {
        return atomsToModels(molecularData)
    }).then((molecularData: IMolContainer) => {
        // Set molName as src on all terminal nodes
        molecularData.src = molName;
        if (molecularData.nodes) {
            getTerminalNodes(molecularData.nodes).forEach((node: IMolContainer) => {
                node.src = molName;
            });
        }

        // Update VueX store
        store.commit("pushToList", {
            name: "molecules",
            val: molecularData
        });

        return molecularData;
    });



        // return _convertAllAtomArraysToModels(molecularData)
        // .then((models: GLModel[]) => {
        //     // Set molName as src on all terminal nodes
        //     molecularData.src = molName;
        //     if (molecularData.nodes) {
        //         getTerminalNodes(molecularData.nodes).forEach((node: IMolContainer) => {
        //             node.src = molName;
        //         });
        //     }
            
        //     store.commit("pushToList", {
        //         name: "molecules",
        //         val: molecularData
        //     });
    
        //     return models;
        // })
    // });
}



