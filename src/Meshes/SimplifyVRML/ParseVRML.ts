import { mergeVertices, updateIndices } from "./MergeVerticesByDistance";
import { truncateValues } from "./Math";

/**
 * Merge multiple VRML chunks into a single chunk
 *
 * @param chunkDatas Array of chunk data containing vertices, indices, colors, and normals
 * @param mergeCutoff Distance cutoff for merging vertices
 * @returns Single merged chunk with combined vertices, indices, colors, and normals
 */
/**
 * Merge multiple VRML chunks into a single chunk
 *
 * @param chunkDatas Array of chunk data containing vertices, indices, colors, and normals
 * @param mergeCutoff Distance cutoff for merging vertices
 * @returns Single merged chunk with combined vertices, indices, colors, and normals
 */
export function mergeChunks(
    chunkDatas: {
        vertices: [number, number, number][];
        indices: number[];
        colors: [number, number, number][];
        normals: [number, number, number][];
        shapeChunkContent: string;
    }[],
    mergeCutoff: number
) {
    // Initialize arrays for combined data
    const allVertices: [number, number, number][] = [];
    const allIndices: number[] = [];
    const allColors: [number, number, number][] = [];
    const allNormals: [number, number, number][] = [];
    let vertexOffset = 0;

    // First combine all chunks while updating indices
    for (const chunk of chunkDatas) {
        // Add vertices, colors and normals
        allVertices.push(...chunk.vertices);
        allColors.push(...chunk.colors);
        if (chunk.normals.length > 0) {
            allNormals.push(...chunk.normals);
        }

        // Update indices with offset and add to combined array - using for loop to avoid stack overflow
        for (let i = 0; i < chunk.indices.length; i++) {
            const idx = chunk.indices[i];
            allIndices.push(idx === -1 ? -1 : idx + vertexOffset);
        }

        // Update offset for next chunk
        vertexOffset += chunk.vertices.length;
    }

    // Then merge vertices using existing mergeVertices function
    const { mergedVertices, mergedColors, mapping } = mergeVertices(
        allVertices,
        allColors,
        mergeCutoff
    );

    // Update indices based on the vertex mapping
    const mergedIndices = updateIndices(allIndices, mapping);

    // Handle normals if they exist
    const mergedNormals =
        allNormals.length > 0 ? allNormals.map(truncateValues) : [];

    return {
        vertices: mergedVertices,
        indices: mergedIndices,
        colors: mergedColors,
        normals: mergedNormals,
    };
}

// Function to parse VRML file and extract vertices, face indices, colors, and normals
/**
 * Parse a VRML file and extract vertices, face indices, colors, and normals.
 *
 * @param {string} fileContent  The content of the VRML file.
 * @returns {object}  The parsed data.
 */
export function parseVRML(fileContent: string): {
    chunkDatas: {
        vertices: [number, number, number][];
        indices: number[];
        colors: [number, number, number][];
        normals: [number, number, number][];
        shapeChunkContent: string;
    }[];
    firstChunkContent: string | undefined;
} {
    // Split the file content into separate sections (Shape { ... } blocks)
    const shapeChunkContents = fileContent.split("Shape {");
    const firstChunkContent = shapeChunkContents.shift();

    let chunkDatas = [];
    for (const chunkIdx in shapeChunkContents) {
        const shapeChunkContent = shapeChunkContents[chunkIdx];

        const vertexRegex = /point \[([\s\S]*?)\]/;
        const indexRegex = /coordIndex \[([\s\S]*?)\]/;
        const colorRegex = /color \[([\s\S]*?)\]/;
        const normalRegex = /vector \[([\s\S]*?)\]/; // For normals (vector field)

        const vertexBlock = shapeChunkContent.match(vertexRegex);
        const indexBlock = shapeChunkContent.match(indexRegex);
        const colorBlock = shapeChunkContent.match(colorRegex);
        const normalBlock = shapeChunkContent.match(normalRegex);

        if (!vertexBlock || !indexBlock) {
            console.error(
                "No vertices or indices found in chunk " +
                    chunkIdx.toString() +
                    " VRML file."
            );
            continue;
        }

        console.log(`Processing chunk ${chunkIdx}`);

        // Parse vertices
        const vertexString = vertexBlock[1];
        if (!vertexString) {
            console.error(
                "No vertices found in chunk " +
                    chunkIdx.toString() +
                    " VRML file."
            );
            continue;
        }
        const vertexNumberStrings = vertexString.match(
            /-?\d+(\.\d+)?([eE][+-]?\d+)?/g
        );
        if (!vertexNumberStrings) {
            console.error(
                "No vertex numbers found in chunk " +
                    chunkIdx.toString() +
                    " VRML file."
            );
            continue;
        }
        const vertexNumbers = vertexNumberStrings.map(Number);
        if (vertexNumbers.length % 3 !== 0) {
            console.error("Vertex data is not a multiple of 3.");
            process.exit(1);
        }
        const vertices: [number, number, number][] = [];
        for (let i = 0; i < vertexNumbers.length; i += 3) {
            vertices.push([
                vertexNumbers[i],
                vertexNumbers[i + 1],
                vertexNumbers[i + 2],
            ]);
        }

        // Parse indices
        const indexString = indexBlock[1];
        const indexNumberStrings = indexString.match(/-?\d+/g);
        if (!indexNumberStrings) {
            console.error(
                "No index numbers found in chunk " +
                    chunkIdx.toString() +
                    " VRML file."
            );
            continue;
        }
        const indexNumbers = indexNumberStrings.map(Number);
        const indices = indexNumbers;

        // Parse colors
        let colors: [number, number, number][] = [];
        if (colorBlock) {
            const colorString = colorBlock[1];
            const colorNumberStrings = colorString.match(
                /-?\d+(\.\d+)?([eE][+-]?\d+)?/g
            );
            if (!colorNumberStrings) {
                console.error(
                    "No color numbers found in chunk " +
                        chunkIdx.toString() +
                        " VRML file."
                );
                continue;
            }
            const colorNumbers = colorNumberStrings.map(Number);
            if (colorNumbers.length % 3 !== 0) {
                console.error("Color data is not a multiple of 3.");
                process.exit(1);
            }
            for (let i = 0; i < colorNumbers.length; i += 3) {
                colors.push([
                    colorNumbers[i],
                    colorNumbers[i + 1],
                    colorNumbers[i + 2],
                ]);
            }
        } else {
            // Assign default colors if none are found
            colors = Array(vertices.length).fill([1.0, 1.0, 1.0]);
        }

        // Parse normals
        const normals: [number, number, number][] = [];
        if (normalBlock) {
            const normalString = normalBlock[1];
            const normalNumberStrings = normalString.match(
                /-?\d+(\.\d+)?([eE][+-]?\d+)?/g
            );
            if (!normalNumberStrings) {
                console.error(
                    "No normal numbers found in chunk " +
                        chunkIdx.toString() +
                        " VRML file."
                );
                continue;
            }
            const normalNumbers = normalNumberStrings.map(Number);
            if (normalNumbers.length % 3 !== 0) {
                console.error("Normal data is not a multiple of 3.");
                process.exit(1);
            }
            for (let i = 0; i < normalNumbers.length; i += 3) {
                normals.push([
                    normalNumbers[i],
                    normalNumbers[i + 1],
                    normalNumbers[i + 2],
                ]);
            }
        }

        // console.log(vertices.length, indices.length, colors.length, normals.length);
        chunkDatas.push({
            vertices,
            indices,
            colors,
            normals,
            shapeChunkContent,
        });
    }

    if (chunkDatas.length > 1) {
        const mergedData = mergeChunks(chunkDatas, 0.001);
        chunkDatas = [chunkDatas[0]];
        chunkDatas[0].vertices = mergedData.vertices;
        chunkDatas[0].indices = mergedData.indices;
        chunkDatas[0].colors = mergedData.colors;
        chunkDatas[0].normals = mergedData.normals;


        // (mergedData as any)["shapeChunkContent"] = chunkDatas[0].shapeChunkContent;
        // chunkDatas = [mergedData];
        // debugger;
    }
    // console.log("QQQ", mergedData);

    return { chunkDatas, firstChunkContent };
}

// Function to replace the vertices, colors, normals, and indices in VRML file with merged ones
/**
 * Replace the vertices, colors, normals, and indices in a VRML file with merged
 * ones.
 *
 * @param {string}    fileContent      The content of the VRML file.
 * @param {number[][]} mergedVertices  The merged vertices.
 * @param {number[][]} mergedColors    The merged colors.
 * @param {number[][]} mergedNormals   The merged normals.
 * @param {number[]}   updatedIndices  The updated indices.
 * @returns {string}  The updated VRML file content.
 */
export function replaceVerticesAndIndicesInVRML(
    fileContent: string,
    mergedVertices: number[][],
    mergedColors: number[][],
    mergedNormals: number[][],
    updatedIndices: number[]
): string {
    const vertexString = mergedVertices.map((v) => v.join(" ")).join(",\n");
    const indexString = updatedIndices.join(",\n");
    const colorString = mergedColors.map((c) => c.join(" ")).join(",\n");
    const normalString =
        mergedNormals.length > 0
            ? mergedNormals.map((n: number[]) => n.join(" ")).join(",\n")
            : "";

    let updatedContent = fileContent.replace(
        /point \[([\s\S]*?)\]/,
        `point [\n${vertexString}\n]`
    );
    updatedContent = updatedContent.replace(
        /coordIndex \[([\s\S]*?)\]/,
        `coordIndex [\n${indexString}\n]`
    );

    if (fileContent.match(/color \[([\s\S]*?)\]/)) {
        updatedContent = updatedContent.replace(
            /color \[([\s\S]*?)\]/,
            `color [\n${colorString}\n]`
        );
    } else {
        // Insert color block after coordIndex if it doesn't exist
        updatedContent = updatedContent.replace(
            /(coordIndex \[[\s\S]*?\])/,
            `$1\ncolor [\n${colorString}\n]`
        );
    }

    if (fileContent.match(/vector \[([\s\S]*?)\]/)) {
        updatedContent = updatedContent.replace(
            /vector \[([\s\S]*?)\]/,
            `vector [\n${normalString}\n]`
        );
    }

    return updatedContent;
}
