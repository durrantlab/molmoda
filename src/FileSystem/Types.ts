import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

// Sometimes importing FileInfo causes a circular dependency. Import IFileInfo
// if you don't need to create a new fileinfo, but only want to work nice with
// typescript.

export interface IFileInfo {
    name: string;
    contents: any; // string, or obj in some cases

    // Name of the ZIP file (if any) to create which contains the file.
    compressedName?: string;

    // If file is derived from a molContainer, it's sometimes useful to keep
    // track of the origial molContainer (e.g., to add data to it).
    molContainer?: IMolContainer;

    // size: number;
    // type: string; // all caps, extension (e.g., "PDB")

    // Only actually works if using FileInfo class, but here for typescript.
    convertFromPDBTxt?: (targetExt: string) => Promise<IFileInfo>;
}

