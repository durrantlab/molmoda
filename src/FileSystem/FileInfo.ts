import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    getFormatInfoGivenType,
    IFormatInfo,
    molFormatInformation,
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
     * @returns {string | undefined}  The file type.
     */
    public getFileType(): string | undefined {
        return getFileType(this);
    }

    /**
     * Returns the format info.
     *
     * @returns {IFormatInfo | undefined}  The format info.
     */
    public getFormatInfo(): IFormatInfo | undefined {
        const typ = this.getFileType();
        if (typ === undefined) return;
        return getFormatInfoGivenType(typ);
    }

    /**
     * Assigns the extension based on the contents. Guesses the format.
     */
    public assignExtByContents() {
        const format = this.guessFormat();
        if (format) {
            this.name = this.name + "." + format.primaryExt;
        }
    }

    /**
     * Guesses the format.
     *
     * @returns {IFormatInfo | undefined}  The format info.
     */
    public guessFormat(): IFormatInfo | undefined {
        const contents = this.contents.trim();

        for (const formatID in molFormatInformation) {
            const format = molFormatInformation[formatID];
            if (format.validateContents === undefined) {
                // No way of validating this one.
                continue;
            }

            if (format === molFormatInformation.SMI) {
                // Waiting until the end to do SMI (it's the most permissive)
                continue;
            }

            if (format.validateContents(contents)) {
                return format;
            }
        }

        // Now try SMI
        if (
            molFormatInformation.SMI.validateContents &&
            molFormatInformation.SMI.validateContents(contents)
        ) {
            return molFormatInformation.SMI;
        }

        // Return undefined if format not found.
        return;
    }
}
