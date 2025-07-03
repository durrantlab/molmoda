import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { FileInfo } from "@/FileSystem/FileInfo";
/**
 * Aligns a list of mobile protein structures to a reference protein structure.
 *
 * @param {FileInfo} referenceFileInfo The FileInfo object for the reference protein.
 * @param {FileInfo[]} mobileFileInfos An array of FileInfo objects for the proteins to be aligned.
 * @returns {Promise<FileInfo[]>} A promise that resolves to an array of FileInfo objects for the aligned proteins.
 * @throws {Error} If the alignment worker fails or returns an error.
 */
export async function alignFileInfos(
    referenceFileInfo: FileInfo,
    mobileFileInfos: FileInfo[]
): Promise<FileInfo[]> {
    const referencePdb = referenceFileInfo.contents;
    const mobilePdbs = mobileFileInfos.map((fi) => fi.contents);
    const worker = new Worker(
        new URL("./AlignProteins.worker.ts", import.meta.url)
    );
    const path = window.location.pathname;
    const basePath =
        window.location.origin + path.substring(0, path.lastIndexOf("/") + 1);
    const result = await runWorker(worker, {
        referencePdb,
        mobilePdbs,
        basePath: basePath,
    });
    if (result.error) {
        throw new Error(result.error);
    }
    const { alignedPdbs } = result;
    const alignedFileInfos: FileInfo[] = [];
    for (let i = 0; i < alignedPdbs.length; i++) {
        const alignedContent = alignedPdbs[i];
        if (alignedContent.startsWith("ERROR:")) {
            console.error(
                `Alignment error for ${mobileFileInfos[i].name}: ${alignedContent}`
            );
            // Optionally, you might want to skip this one or handle the error differently.
            continue;
        }
        const originalFileInfo = mobileFileInfos[i];
        const newName = `aligned.pdb`;
        const newFileInfo = new FileInfo({
            name: newName,
            contents: alignedContent,
            // Carry over the original TreeNode for context when processing results.
            treeNode: originalFileInfo.treeNode,
        });
        alignedFileInfos.push(newFileInfo);
    }
    return alignedFileInfos;
}
