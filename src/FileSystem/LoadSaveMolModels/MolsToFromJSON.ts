// Note that worker sends json. Need to convert atom information to GLModel.

import { dynamicImports } from "@/Core/DynamicImports";
import { GLModel, IAtom, IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getAllNodesFlattened, getTerminalNodes } from "@/UI/Navigation/TreeView/TreeUtils";


export function atomsToModels(molecularData: IMolContainer): Promise<IMolContainer> {
    const nodesWithAtoms = getAllNodesFlattened([molecularData])
        .filter(node => node.model);

    // Convert all the atom arrays to GLModels
    const promises: Promise<GLModel>[] = nodesWithAtoms.map(
        (node: IMolContainer): Promise<GLModel> => {
            return _atomsToModel(node.model as IAtom[])
            .then((model: GLModel) => {
                node.model = model;
                return Promise.resolve(model);
            }
        );
    });
    
    return Promise.all(promises)
    .then(() => {
        return molecularData;
    })
}

export function modelsToAtoms(molecularData: IMolContainer): IMolContainer {
    const nodesWithModels = getAllNodesFlattened([molecularData])
        .filter(node => node.model);

    // Convert all the GLModels to atom arrays
    nodesWithModels.forEach((node: IMolContainer) => {
        node.model = (node.model as GLModel).selectedAtoms({});
    });

    return molecularData;
}

function _atomsToModel(atoms: IAtom[]): Promise<GLModel> {
    return dynamicImports.mol3d.module.then(($3Dmol: any) => {
        const model = new $3Dmol.GLModel();
        model.addAtoms(atoms);
        return model;
    });
}