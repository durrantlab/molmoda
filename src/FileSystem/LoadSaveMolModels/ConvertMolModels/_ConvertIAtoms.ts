import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { IAtom, SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { _convertTreeNodeListToPDB } from "./_ConvertTreeNodeListToPDB";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import type { IFileInfo } from "@/FileSystem/Types";

/**
 * Convert IAtoms to IFileInfo PDB.
 * 
 * @param {IAtom[]} atoms The atoms to convert.
 * @returns {IFileInfo} The converted atoms.
 */
export function convertIAtomsToIFileInfoPDB(atoms: IAtom[]): IFileInfo {
    // I found myself often needing this conversion.

    const node = new TreeNode({
        title: "tmp",
        model: atoms,
        visible: false,
        focused: false,
        viewerDirty: false,
        treeExpanded: false,
        selected: SelectedType.False,
    });

    const pdbTxt = _convertTreeNodeListToPDB(
        new TreeNodeList([node]),
        false
    )[0];

    return {
        name: "tmpmol.pdb",
        contents: pdbTxt,
    } as IFileInfo;
}