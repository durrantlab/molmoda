import { convertMolFormatOpenBabel } from "@/FileSystem/OpenBabelTmp";
import { IFileInfo } from "@/FileSystem/Types";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getFormatInfoGivenType, IFormatInfo } from "../Types/MolFormats";
import { convertMolContainersToPDB } from "./ConvertMolContainerToPDB";

// function bondOrdersAssigned(molContainers: IMolContainer[]): boolean {
//     const bondOrders: Set<number> = new Set();
//     for (const molContainer of molContainers) {
//         const atoms = getAtomsOfModel(molContainer.model as GLModel);
//         for (const atom of atoms) {
//             for (const bondOrder of atom.bondOrder) {
//                 bondOrders.add(bondOrder);
//             }
//         }
//     }

//     return !(bondOrders.size === 1 && bondOrders.has(1));
// }

/**
 * Given a list of mol containers, convert them to a specified molecular format.
 *
 * @param  {IMolContainer[]} molContainers  The list of mol containers.
 * @param  {string}          targetExt            The extension of the format to
 *                                          convert to.
 * @param  {boolean}         [merge=false]  Whether to merge the models into a
 *                                          single PDB string.
 * @returns {string[]} The text-formatted (e.g., PDB, MOL2) strings.
 */
export function convertMolContainers(
    molContainers: IMolContainer[],
    targetExt: string,
    merge = true
): Promise<string[]> {
    targetExt = targetExt.toLowerCase();
    const formatInf = getFormatInfoGivenType(targetExt) as IFormatInfo;
    let molTxts: string[] = [];
    const intermediaryExt = "pdb";

    // let calculateBondOrders = false;
    // if (formatInf.hasBondOrders === true) {
    //     // Sometimes a molecule might not have bond orders assigned, even if the
    //     // format supports it. In this case, use PDB as an intermediary because
    //     // they will force conversion via open babel, which will assign bond
    //     // orders for you.
    //     if (!bondOrdersAssigned(molContainers)) {
    //         calculateBondOrders = true;
    //     } else {
    //         // Use MOL2 as intermediary. First, convert the mol containers to a MOL2
    //         // string.
    //         molTxts = convertMolContainersToMol2(molContainers, merge);
    //         intermediaryExt = "mol2";

    //         // If MOL2 is destination format, just return that
    //         if (formatInf.primaryExt === "mol2") {
    //             return Promise.resolve(molTxts);
    //         }
    //     }
    // }

    // if (formatInf.hasBondOrders !== true || calculateBondOrders) {
    // Use PDB as intermediary. First, convert the mol containers to a PDB
    // string.
    molTxts = convertMolContainersToPDB(molContainers, merge);
    // intermediaryExt = "pdb";

    // If PDB is destination format, just return that
    if (formatInf.primaryExt === "pdb") {
        return Promise.resolve(molTxts);
    }
    // }

    // Since imtermediary is not the destination format, convert to the required format.
    const convertedTxtPromises = molTxts.map((molTxt) =>
        convertMolFormatOpenBabel(
            { name: "tmp." + intermediaryExt, contents: molTxt } as IFileInfo,
            targetExt
        )
    );

    return Promise.all(convertedTxtPromises).then((convertedTxts) => {
        return convertedTxts;
    });
}
