import { dynamicImports } from "@/Core/DynamicImports";


// function checkExtValid(ext: string) {
//     const format = extToFormat[ext];
//     if (!format) {
//         // TODO: Fix
//         throw new Error(`Unsupported format: ${ext}`);
//     }
// }

export function convertMolFormatOpenBabel(
    content: string,
    srcExt: string,
    ext: string
): Promise<string> {
    // Confirm ext is supported
    ext = ext.toLowerCase();
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
        conv.setOutFormat("", ext); // set out format by file extension
        const outData = conv.writeString(mol, false) as string; // get output data, do not trim white spaces
        conv.delete(); // free ObConversionWrapper instance

        return outData;
    });
}

// export function convertFromPDB(pdbTxt: string, ext: string): Promise<string> {
//     return convertMolFormat(pdbTxt, "pdb", ext);
// }

// export function convertToPDB(content: string, ext: string): Promise<string> {
//     return convertMolFormat(content, ext, "pdb");
// }