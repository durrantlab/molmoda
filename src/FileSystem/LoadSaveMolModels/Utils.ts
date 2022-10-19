import {
    IMolContainer,
    GLModel,
} from "@/UI/Navigation/TreeView/TreeInterfaces";

interface ICopiedObj {
    promises: Promise<any>[];
    newNode: any;
}

export const biotiteStateKeysToRetain = ["molecules", "log"];

/* eslint-disable @typescript-eslint/ban-types */
/**
 * Deep copies an object, treating the value associated with the "model" key as
 * a special case.
 *
 * @param  {any}      obj       The object to copy.
 * @param  {Function} modelFunc A function that deals with the value of the
 *                              "model" key.
 * @returns {ICopiedObj} The deep-copied object.
 */
export function copyObjRecursively({
    obj,
    modelFunc,
}: {
    obj: any;
    modelFunc: Function;
}): ICopiedObj {
    const promises: Promise<any>[] = [];
    const _copyObjRecursively = (oldNode: any, mdlFunc: Function) => {
        // Can't use JSON.parse(JSON.stringify(obj)) because need to
        // interconvert between GLModel and [IAtom].
        const origNode: { [key: string]: any } = {};
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
    };

    const newObj = _copyObjRecursively(obj, modelFunc);
    return { newNode: newObj, promises } as ICopiedObj;
}

/**
 * Given an IMolContainer with models specified as GLModel, convert the models
 * to IAtom[].
 *
 * @param  {IMolContainer} molContainer The IMolContainer to convert.
 * @returns {IMolContainer} The converted IMolContainer.
 */
export function modelsToAtoms(molContainer: IMolContainer): IMolContainer {
    const recurseResult = copyObjRecursively({
        obj: molContainer,
        modelFunc: (origNode: IMolContainer, newNode: IMolContainer): void => {
            newNode.model = (origNode.model as GLModel).selectedAtoms({});
        },
    });

    return recurseResult.newNode;
}

