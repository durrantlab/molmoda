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

    // /**
    //  * Given a list of PDB texts, convert them to the target format.
    //  *
    //  * @param {string[]} molTxts  The PDB texts.
    //  * @param {string} targetExt  The target extension.
    //  * @returns {Promise<string[]>}  A promise that resolves to the converted texts.
    //  */
    // private _convertPdbTxt(
    //     molTxts: string[],
    //     targetExt: string
    // ): Promise<string[]> {
    //     const formatInf = getFormatInfoGivenType(targetExt) as IFormatInfo;
    //     const intermediaryExt = "pdb";

    //     // If PDB is destination format, just return that
    //     if (formatInf.primaryExt === "pdb") {
    //         return Promise.resolve(molTxts);
    //     }
    //     // }

    //     // Since intermediary is not the destination format, convert to the required format.
    //     const convertedTxtPromises = molTxts.map((molTxt: string, i) =>
    //         convertFileInfosOpenBabel(
    //             [
    //                 new FileInfo({
    //                     name: "tmp" + i.toString() + "." + intermediaryExt,
    //                     contents: molTxt,
    //                 }),
    //             ],
    //             targetExt, undefined, undefined, false
    //         )
    //     );


    //     return Promise.all(convertedTxtPromises).then(
    //         (convertedTxts: string[][]) => {
    //             // Flatten
    //             return convertedTxts.reduce((acc, val) => acc.concat(val), []);
    //         }
    //     );
    // }

    /**
     * Convers this FileInfo object to a FileInfo object with converted contents
     * text.
     *
     * @param {string} targetExt  The target extension.
     * @returns  {void}  Originally a promise that resolves to a FileInfo object
     *    with converted text (Promise<FileInfo>). However, this function is
     *    deprecated and should not be used.
     */
    convertFromPDBTxt(/* targetExt: string */): Promise<FileInfo> {
        throw "Depreciated. Use convertFileInfosOpenBabel instead.";

        // const prts = getFileNameParts(this.name);

        // if (prts.ext.toLowerCase() !== "pdb") {
        //     throw new Error("Currently only support converting from PDB");
        // }

        // return this._convertPdbTxt([this.contents], targetExt)
        //     .then((molTxts: string[]) => {

        //         // Only one
        //         const molTxt = molTxts[0];
        //         this.contents = molTxt;

        //         // Update filename too.
        //         this.name = prts.basename + "." + targetExt;

        //         // Return this as a convenience
        //         return this
        //     })
        //     .catch((err) => {
        //         throw err;
        //     });
    }
}
