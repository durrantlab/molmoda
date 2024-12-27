/**
 * VRML file processing utilities for parsing, modifying,
 * and reconstructing VRML content during mesh optimization.
 */

import { truncateValues } from "./Math";
import { mergeVertices, updateIndices } from "./MergeVerticesByDistance";
import { parseVRML, replaceVerticesAndIndicesInVRML } from "./ParseVRML";
import { simplifyMesh } from "./QEM";

// Helper function to count faces
/**
 * Count the number of faces in a mesh.
 * 
 * @param {number[]} indices  The indices of the mesh.
 * @returns {number}  The number of faces in the mesh.
 */
function countFaces(indices: number[]): number {
    return indices.filter((index) => index === -1 && index !== undefined)
        .length;
}

/**
 * Process a VRML file by merging vertices, simplifying the mesh, and replacing
 * the vertices and indices in the VRML content.
 *
 * @param {string}  content           The content of the VRML file.
 * @param {number}  mergeCutoff       The distance cutoff for merging vertices.
 * @param {number}  reductionFraction The fraction of vertices to reduce to.
 * @returns {Promise<string>}  The processed VRML content.
 */
export async function processVRML(
    content: string,
    mergeCutoff: number,
    reductionFraction: number
): Promise<string> {
    const { chunkDatas, firstChunkContent } = parseVRML(content);

    const newVRMLContents: string[] = [];

    for (const chunkDataIdx in chunkDatas) {
        const chunkData = chunkDatas[chunkDataIdx];
        const { vertices, indices, colors, normals, shapeChunkContent } =
            chunkData;

        console.log("Original mesh:");
        console.log(`  Vertices: ${vertices.length}`);
        console.log(`  Faces: ${countFaces(indices)}`);

        // Merge vertices by distance and color
        const { mergedVertices, mergedColors, mapping } = mergeVertices(
            vertices,
            colors,
            mergeCutoff
        );
        const updatedIndices = updateIndices(indices, mapping);
        console.log("After vertex merging:");
        console.log(`  Vertices: ${mergedVertices.length}`);
        console.log(`  Faces: ${countFaces(updatedIndices)}`);

        // Calculate target vertex count based on reduction fraction
        let targetVertexCount = null;
        if (reductionFraction !== null) {
            targetVertexCount = Math.round(
                mergedVertices.length * reductionFraction
            );
            // console.log(`Target vertex count: ${targetVertexCount} (${reductionFraction * 100}% of merged vertices)`);
        }

        // Simplify the mesh using Vertex Clustering if targetVertexCount is provided
        let simplifiedVertices = mergedVertices;
        let simplifiedIndices = updatedIndices;
        let simplifiedColors = mergedColors;

        if (targetVertexCount) {
            const simplifiedMesh = simplifyMesh(
                mergedVertices,
                updatedIndices,
                mergedColors,
                targetVertexCount
            );
            simplifiedVertices = simplifiedMesh.vertices.map(truncateValues);
            simplifiedIndices = simplifiedMesh.indices;
            simplifiedColors = simplifiedMesh.colors.map(truncateValues);
            console.log("After Vertex Clustering simplification:");
            console.log(`  Vertices: ${simplifiedVertices.length}`);
            console.log(`  Faces: ${countFaces(simplifiedIndices)}`);
        }

        // Truncate normals if they exist
        const mergedNormals =
            normals.length > 0 ? normals.map(truncateValues) : normals;

        // Replace vertices, colors, normals, and indices in VRML
        const newVRMLContent = replaceVerticesAndIndicesInVRML(
            shapeChunkContent,
            simplifiedVertices,
            simplifiedColors,
            mergedNormals,
            simplifiedIndices
        );

        // console.log(newVRMLContent.slice(0, 1000));

        newVRMLContents.push(newVRMLContent);

        // fs.writeFileSync(outputFile + "_" + vrmlChunkIdx.toString() + ".wrl", newVRMLContent);
        // console.log(`Processed VRML file saved as ${outputFile}`);

        //   console.log(newVRMLContent);
        console.log("");
    }

    const newVRMLContent =
        firstChunkContent + "Shape {" + newVRMLContents.join("Shape {");

    console.log(newVRMLContents.length);

    console.log(newVRMLContent);

    return newVRMLContent;
}
