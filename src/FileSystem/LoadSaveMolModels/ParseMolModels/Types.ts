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
