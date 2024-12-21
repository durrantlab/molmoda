import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { CalcMolPropsQueue } from "./CalcMolPropsQueue";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

export interface ICalcMolProps {
    lipinski: [string, number, string][];
    counts: [string, number, string][];
    other: [string, number, string][];
}

export const lipinskiTitle = "Lipinski";
export const countsTitle = "Counts";
export const otherTitle = "Misc";

/**
 * Calculates the molecular properties for the given molecules.
 *
 * @param  {string[]}                    smilesStrs            The SMILES
 *                                                             strings of the
 *                                                             molecules to
 *                                                             calculate the
 *                                                             properties for.
 * @param  {(TreeNode|undefined)[]} [associatedTreeNodes]  The associated
 *                                                             molecule
 *                                                             containers.
 * @returns {Promise<ICalcMolProps[]>}  The calculated molecular properties.
 */
export async function calcMolProps(
    smilesStrs: string[],
    associatedTreeNodes?: (TreeNode | undefined)[]
): Promise<ICalcMolProps[]> {
    // Create the list of properties, currently full of undefineds.
    const molDescriptors: (ICalcMolProps | undefined)[] = [];
    for (let i = 0; i < smilesStrs.length; i++) {
        molDescriptors.push(undefined);
    }

    const formatForTreeNode = associatedTreeNodes !== undefined;

    // Identify any ones that have already been calculated.
    if (formatForTreeNode) {
        // Filter out those containers that already have calculated data.
        for (let i = 0; i < associatedTreeNodes.length; i++) {
            const associatedTreeNode = associatedTreeNodes[i];
            if (!associatedTreeNode) {
                continue;
            }

            if (
                associatedTreeNode.data &&
                associatedTreeNode.data[lipinskiTitle] &&
                associatedTreeNode.data[countsTitle] &&
                associatedTreeNode.data[otherTitle]
            ) {
                // Already calculated.
                molDescriptors[i] = {
                    lipinski: associatedTreeNode.data[lipinskiTitle] as any,
                    counts: associatedTreeNode.data[countsTitle] as any,
                    other: associatedTreeNode.data[otherTitle] as any,
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

    const payloads = smilesToCalculate.map((smilesStr) => {
        return {
            smilesStr: smilesStr,
            formatForTreeNode: formatForTreeNode,
        };
    });

    const maxProcs = await getSetting("maxProcs");

    // Batching 25 at a time. This was chosen arbitrarily.
    return new CalcMolPropsQueue("molProps", payloads, maxProcs, undefined, 1).done
        .then((calculatedProps: any) => {
            for (let i = 0; i < calculatedProps.length; i++) {
                const calculatedProp = calculatedProps[i];
                const { descriptors, treeNodeData } = calculatedProp;
                const idx = indexesToCalculate[i];

                // Add to the associated container if appropriate.
                if (formatForTreeNode) {
                    (associatedTreeNodes[idx] as TreeNode).data = {
                        ...(associatedTreeNodes[idx] as TreeNode).data,
                        ...treeNodeData,
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
