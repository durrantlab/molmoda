// main.js
const fs = require('fs');
const { parseVRML, replaceVerticesAndIndicesInVRML } = require('./parseVRML');
const { mergeVertices, updateIndices } = require('./mergeVerticesByDistance');
const { truncateValues } = require('./math');
// const { simplifyMesh } = require('./qem');
const { simplifyMesh } = require('./vertexClustering');

// Helper function to count faces
function countFaces(indices) {
    return indices.filter(index => index === -1).length;
}

// Main function to read VRML file, merge vertices, colors, normals, update indices, and save the result
async function processVRML(inputFile, outputFile, cutoff, targetVertexCount) {
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    let { vertices, indices, colors, normals } = parseVRML(fileContent);

    console.log('Original mesh:');
    console.log(`  Vertices: ${vertices.length}`);
    console.log(`  Faces: ${countFaces(indices)}`);

    // Merge vertices by distance and color
    const { mergedVertices, mergedColors, mapping } = mergeVertices(vertices, colors, cutoff);
    const updatedIndices = updateIndices(indices, mapping);

    console.log('After vertex merging:');
    console.log(`  Vertices: ${mergedVertices.length}`);
    console.log(`  Faces: ${countFaces(updatedIndices)}`);

    // Simplify the mesh using QEM if targetVertexCount is provided
    let simplifiedVertices = mergedVertices;
    let simplifiedIndices = updatedIndices;
    if (targetVertexCount) {
        // const gridSize = Math.ceil(Math.pow(mergedVertices.length / targetVertexCount, 1 / 3));
        const simplifiedMesh = simplifyMesh(mergedVertices, updatedIndices, targetVertexCount);
        simplifiedVertices = simplifiedMesh.vertices.map(truncateValues);
        simplifiedIndices = simplifiedMesh.indices;
        console.log('After Vertex Clustering simplification:');
        console.log(`  Vertices: ${simplifiedVertices.length}`);
        console.log(`  Faces: ${countFaces(simplifiedIndices)}`);
    }

    // Truncate normals if they exist
    const mergedNormals = normals.length > 0 ? normals.map(truncateValues) : normals;

    const newVRMLContent = replaceVerticesAndIndicesInVRML(
        fileContent,
        simplifiedVertices,
        mergedColors,
        mergedNormals,
        simplifiedIndices
    );
    fs.writeFileSync(outputFile, newVRMLContent);
    console.log(`Processed VRML file saved as ${outputFile}`);
}

// Read input arguments
const inputFile = process.argv[2];
const outputFile = process.argv[3];
// Cutoff defaults to 0.1 if not given
let cutoff = isNaN(parseFloat(process.argv[4])) ? 0.1 : parseFloat(process.argv[4]);
let targetVertexCount = isNaN(parseInt(process.argv[5])) ? null : parseInt(process.argv[5]);

if (!inputFile || !outputFile) {
    console.error('Usage: node main.js <inputFile> <outputFile> [cutoff] [targetVertexCount]');
    process.exit(1);
}

// Run the process
processVRML(inputFile, outputFile, cutoff, targetVertexCount);