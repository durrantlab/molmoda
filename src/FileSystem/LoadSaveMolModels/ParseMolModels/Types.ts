import { FileInfo } from "@/FileSystem/FileInfo";
import { IGen3DOptions } from "@/FileSystem/OpenBabel/OpenBabel";

export interface ILoadMolParams {
    fileInfo: FileInfo;
    tag: string | null;  // The plugin id, usually. Gets added to a list to keep track.
    addToTree?: boolean;
    desalt?: boolean;
    gen3D?: IGen3DOptions;
    defaultTitle?: string;
    surpressMsgs?: boolean;
    hideOnLoad?: boolean;
    // When false, separate compounds that are covalently bonded to each other
    // are left as distinct compounds rather than merged into one. Defaults to
    // true (merge).
    mergeBondedCompounds?: boolean;
}

/**
 * Add default values to the load mol params.
 * 
 * @param {ILoadMolParams} params  The params to add defaults to.
 * @returns {ILoadMolParams}  The params with defaults added.
 */
export function addDefaultLoadMolParams(
    params: ILoadMolParams
): ILoadMolParams {
    return {
        addToTree: true,
        desalt: false,
        defaultTitle: "Molecule",
        hideOnLoad: false,
        mergeBondedCompounds: true,
        ...params,
    };
}
