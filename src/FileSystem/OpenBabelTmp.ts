import { dynamicImports } from "@/Core/DynamicImports";

// function checkExtValid(ext: string) {
//     const format = extToFormat[ext];
//     if (!format) {
//         // TODO: Fix
//         throw new Error(`Unsupported format: ${ext}`);
//     }
// }

/**
 * Converts a molecule to another format using OpenBabel.
 *
 * @param  {string} content    The content of the molecule.
 * @param  {string} srcExt     The source extension.
 * @param  {string} targetExt  The target extension.
 * @returns {Promise<string>}  A promise that resolves to the converted
 *     molecule.
 */
export function convertMolFormatOpenBabel(
    content: string,
    srcExt: string,
    targetExt: string
): Promise<string> {
    // Confirm ext is supported
    targetExt = targetExt.toLowerCase();
    // checkExtValid(ext);
    srcExt = srcExt.toLowerCase();
    // checkExtValid(srcExt);

    return dynamicImports.openbabeljs.module.then(() => {
        const OpenBabel = (window as any)["OpenBabel"];

        // See https://partridgejiang.github.io/cheminfo-to-web/demos/items/OpenBabel/openBabelDemo.html
        const conv = new OpenBabel.ObConversionWrapper(); // create ObConversionWrapper instance
        const inData = content; // set input data
        conv.setInFormat("", srcExt); // set input format by file extension
        const mol = new OpenBabel.OBMol(); // create a new molecule object...
        conv.readString(mol, inData); // ... and load it with input data
        conv.setOutFormat("", targetExt); // set out format by file extension
        const outData = conv.writeString(mol, false) as string; // get output data, do not trim white spaces
        conv.delete(); // free ObConversionWrapper instance

        return outData;
    });
}

// export function make3D(): Promise<string> {
//     // NOT YET TESTED. Seehttps://partridgejiang.github.io/cheminfo-to-web/demos/items/OpenBabel/openBabelDemo.html
//     return dynamicImports.openbabeljs.module.then(() => {
//         const OpenBabel = (window as any)["OpenBabel"];

//         const molData = "...."; // MOL format molecule data
//         const conv = new OpenBabel.ObConversionWrapper();
//         conv.setInFormat("", "mol");
//         const mol = new OpenBabel.OBMol();
//         conv.readString(mol, molData);
//         const gen3d = OpenBabel.OBOp.FindType("Gen3D");
//         if (!gen3d.Do(mol, "")) {
//             console.error("Generate 3D failed");
//             conv.delete();
//             return;
//         } else {
//             conv.setOutFormat("", "mol");
//             const outputData = conv.writeString(mol, false);
//             conv.delete();
//             console.log(outputData);
//             return outputData;
//         }
//     });
// }