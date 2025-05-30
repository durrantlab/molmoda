import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { EasyParserParent } from "./EasyParserParent";
import { EasyParserGLModel } from "./EasyParserGLModel";
import { EasyParserPDB } from "./EasyParserPDB";
import { IFileInfo } from "@/FileSystem/Types";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getFormatInfoGivenType } from "../../Types/MolFormats";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { EasyParserIAtomList } from "./EasyParserIAtomList";
import { EasyParserMol2 } from "./EasyParserMol2";
import { EasyParserSDF } from "./EasyParserSDF";

/**
 * This function creates an EasyParser object from a given source.
 *
 * @param {IFileInfo | GLModel | IAtom[] | undefined} src The source to parse.
 * @returns {EasyParserParent} The EasyParser object.
 */
export function makeEasyParser(
    src: IFileInfo | GLModel | IAtom[] | undefined
): EasyParserParent {
    // If undefined, return an empty parser.
    if (src === undefined) {
        return new EasyParserIAtomList([]);
    }

    // If its an array, assume it's an atom list.
    if (Array.isArray(src)) {
        return new EasyParserIAtomList(src);
    }

    if ((src as GLModel).selectedAtoms !== undefined) {
        return new EasyParserGLModel(src);
    }

    // Get type of src.
    const typ = new FileInfo(src as IFileInfo).getFileType();
    const formatInfo = getFormatInfoGivenType(typ as string);

    if (formatInfo?.primaryExt === "pdb") {
        return new EasyParserPDB(src as IFileInfo);
    }
    if (formatInfo?.primaryExt === "sdf" || formatInfo?.primaryExt === "mol") {
        return new EasyParserSDF(src as IFileInfo);
    }
    if (formatInfo?.primaryExt === "mol2") {
        return new EasyParserMol2(src as IFileInfo);
    }

    // Fallback or throw error if format not supported by EasyParsers
    console.warn(
        `EasyParser: Format "${typ}" (primaryExt: "${formatInfo?.primaryExt}") not explicitly handled. Defaulting to Mol2 parser, which may not be correct.`
    );
    // As a last resort, try Mol2 parser, or consider throwing an error.
    return new EasyParserMol2(src as IFileInfo);
}
