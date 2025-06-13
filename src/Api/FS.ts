import {
    saveTxt,
    uncompress,
    savePngUri,
    saveZipWithTxtFiles,
    saveSvg,
    createZipBlob,
} from "@/Core/FS/FS";
export const fsApi = {
    saveZipWithTxtFiles: saveZipWithTxtFiles,
    saveTxt: saveTxt,
    uncompress: uncompress,
    savePngUri: savePngUri,
    saveSvg: saveSvg,
    createZipBlob: createZipBlob,
};
