import { FileInfo } from "@/FileSystem/FileInfo";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { _convertTreeNodeListToPDB } from "./_ConvertTreeNodeListToPDB";

// function bondOrdersAssigned(treeNodes: TreeNode[]): boolean {
//     const bondOrders: Set<number> = new Set();
//     for (const treeNode of treeNodes) {
//         const atoms = getAtomsOfModel(treeNode.model as GLModel);
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
 * Don't call this function directly. Instead, use TreeNodeList.toFileInfos().
 *
 * @param  {TreeNodeList}  treeNodeList  The list of mol containers.
 * @param  {string}        targetExt      The extension of the format to convert
 *                                        to.
 * @param  {boolean}      [merge=false]   Whether to merge the models into a
 *                                        single PDB string.
 * @returns {FileInfo[]}  The text-formatted (e.g., PDB, MOL2) strings.
 */
export function _convertTreeNodeList(
    treeNodeList: TreeNodeList,
    targetExt: string,
    merge = true
): Promise<FileInfo[]> {
    targetExt = targetExt.toLowerCase();
    let molTxts: string[] = [];

    // let calculateBondOrders = false;
    // if (formatInf.hasBondOrders === true) {
    //     // Sometimes a molecule might not have bond orders assigned, even if the
    //     // format supports it. In this case, use PDB as an intermediary because
    //     // they will force conversion via open babel, which will assign bond
    //     // orders for you.
    //     if (!bondOrdersAssigned(treeNodeList)) {
    //         calculateBondOrders = true;
    //     } else {
    //         // Use MOL2 as intermediary. First, convert the mol containers to a MOL2
    //         // string.
    //         molTxts = convertTreeNodeToMol2(treeNodeList, merge);
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
    molTxts = _convertTreeNodeListToPDB(treeNodeList, merge);

    const fileInfos = molTxts.map(
        (molTxt: string, idx: number) =>
            new FileInfo({
                name: `tmpmol${idx}.pdb`,
                contents: molTxt,
            })
    );

    return convertFileInfosOpenBabel(fileInfos, targetExt).then(
        (contents: string[]) => {

            return contents.map((content: string) => {
                return new FileInfo({
                    name: `tmpmol.${targetExt}`,
                    contents: content,
                });
            });
        }
    );

    // const promises = fileInfos.map((fileInfo: FileInfo) =>
    //     fileInfo.convertFromPDBTxt(targetExt)
    // );

    // return Promise.all(promises);
}
