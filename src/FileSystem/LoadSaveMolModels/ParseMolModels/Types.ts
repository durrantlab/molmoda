import { FileInfo } from "@/FileSystem/FileInfo";
import { IGen3DOptions } from "@/FileSystem/OpenBabel/OpenBabel";

export interface ILoadMolParams {
    fileInfo: FileInfo;
    tag: string | null;  // The plugin id, usually. Gets added to a list to keep track.
    addToTree?: boolean;
    desalt?: boolean;
    gen3D?: IGen3DOptions;
    defaultTitle?: string;
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
        ...params,
    };
}
