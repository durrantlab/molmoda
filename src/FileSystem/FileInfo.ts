import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    getFormatInfoGivenType,
    IFormatInfo,
} from "./LoadSaveMolModels/Types/MolFormats";
import { IFileInfo } from "./Types";
import { getFileType } from "./Utils2";

/**
 * Class FileInfo
 */
export class FileInfo {
    name: string;
    contents: any;
    compressedName?: string;
    treeNode?: TreeNode;
    cachedConvertText: { [key: string]: string } = {};
    auxData: any;

    /**
     * The constructor.
     *
     * @param {IFileInfo} fileInfo  The IFileInfo object.
     */
    constructor(fileInfo: IFileInfo) {
        this.name = fileInfo.name;
        this.contents = fileInfo.contents;
        this.compressedName = fileInfo.compressedName;
        this.treeNode = fileInfo.treeNode;
    }

    /**
     * Serializes this FileInfo object.
     *
     * @returns {IFileInfo}  The serialized object.
     */
    public serialize(): IFileInfo {
        return {
            name: this.name,
            contents: this.contents,
            compressedName: this.compressedName,
            treeNode: this.treeNode,
            auxData: this.auxData,
        } as IFileInfo;
    }

    /**
     * Returns the file type.
     * 
     * @returns {string}  The file type.
     */
    public getFileType(): string {
        return getFileType(this);
    }

    /**
     * Returns the format info.
     * 
     * @returns {IFormatInfo | undefined}  The format info.
     */
    public getFormatInfo(): IFormatInfo | undefined {
        const typ = this.getFileType();
        return getFormatInfoGivenType(typ);
    }
}
