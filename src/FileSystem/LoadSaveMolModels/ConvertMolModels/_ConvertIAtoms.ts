import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { IAtom, SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { _convertTreeNodeListToPDB } from "./_ConvertTreeNodeListToPDB";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import type { IFileInfo } from "@/FileSystem/Types";

/**
 * Convert an array of IAtom objects to a PDB-format IFileInfo. The
 * returned object is frozen to prevent Vue reactivity overhead, since
 * model data is treated as immutable after creation.
 *
 * @param {IAtom[]} atoms  The atoms to convert to PDB text.
 * @returns {IFileInfo}  A frozen file-info object containing PDB text.
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

    const fileInfo: IFileInfo = {
        name: "tmpmol.pdb",
        contents: pdbTxt,
    };
    Object.freeze(fileInfo);
    return fileInfo;
}