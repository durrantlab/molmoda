// Note that worker sends json. Need to convert atom information to GLModel.

/* eslint-disable @typescript-eslint/ban-types */

import { dynamicImports } from "@/Core/DynamicImports";
import { GLModel, IAtom, IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";

interface ICopiedObj {
    promises: Promise<any>[];
    newNode: any;
}

function copyObjRecursively(obj: any, modelFunc: Function): ICopiedObj {
    const promises: Promise<any>[] = [];
    const _copyObjRecursively = (oldNode: any, mdlFunc: Function) => {
        // Can't just use JSON.parse(JSON.stringify(obj)) because need to
        // interconvert between GLModel and [IAtom].
        const origNode: {[key: string]: any} = {};
        for (const key in oldNode) {
            const val = oldNode[key];
            if (key === "model") {
                const modelPromise = mdlFunc(oldNode, origNode);
                promises.push(modelPromise);
            } else if (Array.isArray(val)) {
                origNode[key] = val.map((item: any) => {
                    return _copyObjRecursively(item, mdlFunc);
                });
            } else if (typeof val === "object") {
                origNode[key] = _copyObjRecursively(val, mdlFunc);
            } else {
                origNode[key] = val;
            }
        }
        return origNode;
    }

    const newObj = _copyObjRecursively(obj, modelFunc);
    return {newNode: newObj, promises} as ICopiedObj;
}

export function atomsToModels(molecularData: IMolContainer): Promise<IMolContainer> {
    const recurseResult = copyObjRecursively(
        molecularData, 
        (origNode: IMolContainer, newNode: IMolContainer): Promise<void> => {
            return _atomsToModel(origNode.model as IAtom[])
            .then((model: GLModel) => {
                newNode.model = model;
                return Promise.resolve();
            });
        }
    );

    return Promise.all(recurseResult.promises)
    .then(() => {
        return recurseResult.newNode;
    });
}

export function modelsToAtoms(molecularData: IMolContainer): IMolContainer {
    const recurseResult = copyObjRecursively(
        molecularData, 
        (origNode: IMolContainer, newNode: IMolContainer): void => { // Promise<void> => {
            newNode.model = (origNode.model as GLModel).selectedAtoms({});
        }
    );
    
    return recurseResult.newNode;
}

function _atomsToModel(atoms: IAtom[]): Promise<GLModel> {
    return dynamicImports.mol3d.module.then(($3Dmol: any) => {
        const model = new $3Dmol.GLModel();
        model.addAtoms(atoms);
        return model;
    });
}