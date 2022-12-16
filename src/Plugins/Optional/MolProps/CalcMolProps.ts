import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface ICalcMolProps {
    lipinski: any[][];
    counts: any[][];
    other: any[][];
}

export const lipinskiTitle = "Lipinski Chemical Properties";
export const countsTitle = "Counts Chemical Properties";
export const otherTitle = "Other Chemical Properties";

/**
 * Calculates the molecular properties for the given molecules.
 *
 * @param  {string[]}                    smilesStrs            The SMILES
 *                                                             strings of the
 *                                                             molecules to
 *                                                             calculate the
 *                                                             properties for.
 * @param  {(IMolContainer|undefined)[]} [associatedMolCntrs]  The associated
 *                                                             molecule
 *                                                             containers.
 * @returns {Promise<ICalcMolProps[]>}  The calculated molecular properties.
 */
export function calcMolProps(
    smilesStrs: string[],
    associatedMolCntrs?: (IMolContainer | undefined)[]
): Promise<ICalcMolProps[]> {
    // Create the list of properties, currently full of undefineds.
    const molDescriptors: (ICalcMolProps | undefined)[] = [];
    for (let i = 0; i < smilesStrs.length; i++) {
        molDescriptors.push(undefined);
    }

    const formatForMolContainer = associatedMolCntrs !== undefined;

    // Identify any ones that have already been calculated.
    if (formatForMolContainer) {
        // Filter out those containers that already have calculated data.
        for (let i = 0; i < associatedMolCntrs.length; i++) {
            const associatedMolContainer = associatedMolCntrs[i];
            if (!associatedMolContainer) {
                continue;
            }

            if (
                associatedMolContainer.data &&
                associatedMolContainer.data[lipinskiTitle] &&
                associatedMolContainer.data[countsTitle] &&
                associatedMolContainer.data[otherTitle]
            ) {
                // Already calculated.
                molDescriptors[i] = {
                    lipinski: associatedMolContainer.data[lipinskiTitle] as any,
                    counts: associatedMolContainer.data[countsTitle] as any,
                    other: associatedMolContainer.data[otherTitle] as any,
                } as ICalcMolProps;
            }
        }
    }

    // Get the indexes of the ones that need to be calculated.
    const indexesToCalculate: number[] = [];
    for (let i = 0; i < molDescriptors.length; i++) {
        if (!molDescriptors[i]) {
            indexesToCalculate.push(i);
        }
    }

    // If there are none to calculate, then return the list.
    if (indexesToCalculate.length === 0) {
        return Promise.resolve(molDescriptors as ICalcMolProps[]);
    }

    // Get the smiles strings for the ones that need to be calculated.
    const smilesToCalculate = [];
    for (const index of indexesToCalculate) {
        smilesToCalculate.push(smilesStrs[index]);
    }

    const worker = new Worker(
        new URL("./CalcMolProps.worker", import.meta.url)
    );

    return runWorker(worker, {
        smilesStrs: smilesToCalculate,
        formatForMolContainer,
    })
        .then((calculatedProps: any[]) => {
            for (let i = 0; i < calculatedProps.length; i++) {
                const calculatedProp = calculatedProps[i];
                const descriptors = calculatedProp.descriptors;
                const molContainerData = calculatedProp.molContainerData;
                const idx = indexesToCalculate[i];

                // Add to the associated container if appropriate.
                if (formatForMolContainer) {
                    (associatedMolCntrs[idx] as IMolContainer).data = {
                        ...(associatedMolCntrs[idx] as IMolContainer).data,
                        ...molContainerData,
                    };
                }

                molDescriptors[idx] = descriptors;
            }

            return molDescriptors as ICalcMolProps[];
        })
        .catch((err: Error) => {
            throw err;
        });
}
