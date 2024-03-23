import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { EasyParserParent } from "./EasyParserParent";
import { EasyParserGLModel } from "./EasyParserGLModel";
import { EasyParserPDB } from "./EasyParserPDB";
import { IFileInfo } from "@/FileSystem/Types";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getFormatInfoGivenType } from "../../Types/MolFormats";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { EasyParserIAtomList } from "./EasyParserIAtomList";

export function makeEasyParser(src: IFileInfo | GLModel | IAtom[] | undefined): EasyParserParent {
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
        return new EasyParserPDB(src);
    }

    // TODO: Below should be mol2!
    return new EasyParserPDB(src);
}