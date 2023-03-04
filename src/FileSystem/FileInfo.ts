import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getFileNameParts } from "./FilenameManipulation";
import {
    getFormatInfoGivenType,
    IFormatInfo,
} from "./LoadSaveMolModels/Types/MolFormats";
import { convertFileInfosOpenBabel } from "./OpenBabel/OpenBabel";
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
        } as IFileInfo;
    }

    public getFileType(): string {
        return getFileType(this);
    }

    public getFormatInfo(): IFormatInfo | undefined {
        const typ = this.getFileType();
        return getFormatInfoGivenType(typ);
    }

    /**
     * Given a list of PDB texts, convert them to the target format.
     *
     * @param {string[]} molTxts  The PDB texts.
     * @param {string} targetExt  The target extension.
     * @returns {Promise<string[]>}  A promise that resolves to the converted texts.
     */
    private _convertPdbTxt(
        molTxts: string[],
        targetExt: string
    ): Promise<string[]> {
        const formatInf = getFormatInfoGivenType(targetExt) as IFormatInfo;
        const intermediaryExt = "pdb";

        // If PDB is destination format, just return that
        if (formatInf.primaryExt === "pdb") {
            return Promise.resolve(molTxts);
        }
        // }

        // Since intermediary is not the destination format, convert to the required format.
        const convertedTxtPromises = molTxts.map((molTxt: string) =>
            convertFileInfosOpenBabel(
                [
                    new FileInfo({
                        name: "tmp." + intermediaryExt,
                        contents: molTxt,
                    }),
                ],
                targetExt
            )
        );

        return Promise.all(convertedTxtPromises).then(
            (convertedTxts: string[][]) => {
                // Flatten
                return convertedTxts.reduce((acc, val) => acc.concat(val), []);
            }
        );
    }

    /**
     * Convers this FileInfo object to a FileInfo object with converted contents
     * text.
     *
     * @param {string} targetExt  The target extension.
     * @returns  {Promise<FileInfo>}  A promise that resolves to a FileInfo
     *     object with converted text.
     */
    convertFromPDBTxt(targetExt: string): Promise<FileInfo> {
        const prts = getFileNameParts(this.name);

        if (prts.ext.toLowerCase() !== "pdb") {
            throw new Error("Currently only support converting from PDB");
        }

        return this._convertPdbTxt([this.contents], targetExt)
            .then((molTxts: string[]) => {
                // Only one
                const molTxt = molTxts[0];
                this.contents = molTxt;

                // Update filename too.
                this.name = prts.basename + "." + targetExt;

                // Return this as a convenience
                return this;
            })
            .catch((err) => {
                throw err;
            });
    }
}
