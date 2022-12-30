// Sometimes importing FileInfo causes a circular dependency. Import IFileInfo
// if you don't need to create a new fileinfo, but only want to work nice with
// typescript.

import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";

export interface IFileInfo {
    name: string;
    contents: any; // string, or obj in some cases

    // Name of the ZIP file (if any) to create which contains the file.
    compressedName?: string;

    // If file is derived from a treeNode, it's sometimes useful to keep track
    // of the origial treeNode (e.g., to add data to it).
    treeNode?: TreeNode;

    // size: number;
    // type: string; // all caps, extension (e.g., "PDB")

    // Only actually works if using FileInfo class, but here for typescript.
    convertFromPDBTxt?: (targetExt: string) => Promise<IFileInfo>;
}

