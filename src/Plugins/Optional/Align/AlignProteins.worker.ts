import {
    waitForDataFromMainThread,
    sendResponseToMainThread,
} from "@/Core/WebWorkers/WorkerHelper";
let usalignModuleLoaded = false;
/**
 * Aligns multiple protein PDB structures to a reference protein structure.
 *
 * @param {string} referencePdb The content of the reference PDB file.
 * @param {string[]} mobilePdbs An array of PDB file contents for the structures to be aligned.
 * @param {string} basePath The base path of the application, used to locate worker scripts.
 * @returns {Promise<string[]>} A promise that resolves to an array of aligned PDB strings.
 */
async function alignPdbContents(
    referencePdb: string,
    mobilePdbs: string[],
    basePath: string
): Promise<string[]> {
    // Load the US-align WebAssembly module if it hasn't been already
    if (!usalignModuleLoaded) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        importScripts(`${basePath}js/usalign/USalign.js`);
        usalignModuleLoaded = true;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof USalignModule === "undefined") {
        throw new Error(
            "USalignModule is not defined. The script might have failed to load."
        );
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const usalign = await USalignModule({
        locateFile(path: string): string {
            // The path for locateFile should be relative to where the main USalign.js script is.
            return `${basePath}js/usalign/${path}`;
        },
    });
    const alignedPdbResults: string[] = [];
    const referenceFilename = "ref.pdb";
    usalign.FS.writeFile(referenceFilename, referencePdb);
    for (let i = 0; i < mobilePdbs.length; i++) {
        const mobileContent = mobilePdbs[i];
        const mobileFilename = `mobile_${i}.pdb`;
        const outputFilename = `sup_${i}`;
        usalign.FS.writeFile(mobileFilename, mobileContent);
        const args = [
            mobileFilename,
            referenceFilename,
            "-o",
            outputFilename,
            "-mol",
            "prot",
        ];
        try {
            usalign.callMain(args);
            alignedPdbResults.push(
                usalign.FS.readFile(`${outputFilename}.pdb`, {
                    encoding: "utf8",
                })
            );
            usalign.FS.unlink(`${outputFilename}.pdb`);
        } catch (e) {
            console.error(`Failed to align structure #${i}. Error:`, e);
            alignedPdbResults.push(
                `ERROR: Alignment failed for structure #${i}`
            );
        }
        usalign.FS.unlink(mobileFilename);
    }
    usalign.FS.unlink(referenceFilename);
    return alignedPdbResults;
}
/**
 * Main function for the web worker.
 */
async function main() {
    const payload = (await waitForDataFromMainThread()) as any;
    const { referencePdb, mobilePdbs, basePath } = payload;
    try {
        const alignedPdbs = await alignPdbContents(
            referencePdb,
            mobilePdbs,
            basePath
        );
        sendResponseToMainThread({ alignedPdbs });
    } catch (error: any) {
        // If an error occurs during WASM initialization or alignment, send it back.
        sendResponseToMainThread({ error: error.message });
    }
}
main();
