const fs = require('fs');
const { parseVRML, replaceVerticesAndIndicesInVRML } = require('./parseVRML');
const { mergeVertices, updateIndices } = require('./mergeVerticesByDistance');
const { truncateValues } = require('./math');
// const { simplifyMesh } = require('./vertexClustering');
const { simplifyMesh } = require('./qem');

// Helper function to count faces
function countFaces(indices) {
    return indices.filter(index => index === -1).length;
}

// Main function to read VRML file, merge vertices, colors, normals, update indices, and save the result
async function processVRML(inputFile, outputFile, cutoff, reductionFraction) {
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    let {chunkDatas, firstChunkContent} = parseVRML(fileContent);

    const newVRMLContents = []

    for (let chunkDataIdx in chunkDatas) {
        const chunkData = chunkDatas[chunkDataIdx];
        let { vertices, indices, colors, normals, shapeChunkContent } = chunkData;

        console.log('Original mesh:');
        console.log(`  Vertices: ${vertices.length}`);
        console.log(`  Faces: ${countFaces(indices)}`);

        // Merge vertices by distance and color
        const { mergedVertices, mergedColors, mapping } = mergeVertices(vertices, colors, cutoff);
        const updatedIndices = updateIndices(indices, mapping);
        console.log('After vertex merging:');
        console.log(`  Vertices: ${mergedVertices.length}`);
        console.log(`  Faces: ${countFaces(updatedIndices)}`);

        // Calculate target vertex count based on reduction fraction
        let targetVertexCount = null;
        if (reductionFraction !== null) {
            targetVertexCount = Math.round(mergedVertices.length * reductionFraction);
            // console.log(`Target vertex count: ${targetVertexCount} (${reductionFraction * 100}% of merged vertices)`);
        }

        // Simplify the mesh using Vertex Clustering if targetVertexCount is provided
        let simplifiedVertices = mergedVertices;
        let simplifiedIndices = updatedIndices;
        let simplifiedColors = mergedColors;

        if (targetVertexCount) {
            const simplifiedMesh = simplifyMesh(mergedVertices, updatedIndices, mergedColors, targetVertexCount);
            simplifiedVertices = simplifiedMesh.vertices.map(truncateValues);
            simplifiedIndices = simplifiedMesh.indices;
            simplifiedColors = simplifiedMesh.colors.map(truncateValues);
            console.log('After Vertex Clustering simplification:');
            console.log(`  Vertices: ${simplifiedVertices.length}`);
            console.log(`  Faces: ${countFaces(simplifiedIndices)}`);
        }

        // Truncate normals if they exist
        const mergedNormals = normals.length > 0 ? normals.map(truncateValues) : normals;

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
        console.log("")
    }

    const newVRMLContent = firstChunkContent + 'Shape {' + (newVRMLContents.join('Shape {'));

    console.log(newVRMLContents.length)

    fs.writeFileSync(outputFile, newVRMLContent);
    console.log(`Processed VRML file saved as ${outputFile}`);
}

// Read input arguments
const inputFile = process.argv[2];
const outputFile = process.argv[3];
// Cutoff defaults to 0.1 if not given
let cutoff = isNaN(parseFloat(process.argv[4])) ? 0.1 : parseFloat(process.argv[4]);
let reductionFraction = isNaN(parseFloat(process.argv[5])) ? 0.5 : parseFloat(process.argv[5]);

if (!inputFile || !outputFile) {
    console.error('Usage: node main.js <inputFile> <outputFile> [cutoff] [reductionFraction]');
    process.exit(1);
}

// Validate reductionFraction
if (reductionFraction !== null && (reductionFraction <= 0 || reductionFraction > 1)) {
    console.error('Error: reductionFraction must be between 0 and 1');
    process.exit(1);
}

// Run the process
processVRML(inputFile, outputFile, cutoff, reductionFraction);