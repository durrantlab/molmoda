// parseVRML.js

// Function to parse VRML file and extract vertices, face indices, colors, and normals
function parseVRML(fileContent) {
    // Split the file content into separate sections (Shape { ... } blocks)
    let shapeChunkContents = fileContent.split('Shape {')
    const firstChunkContent = shapeChunkContents.shift();

    const chunkDatas = []
    for (let chunkIdx in shapeChunkContents) {
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
            console.error("No vertices or indices found in chunk " + chunkIdx.toString() + " VRML file.");
            continue
        }

        console.log(`Processing chunk ${chunkIdx}`);

        // Parse vertices
        const vertexString = vertexBlock[1];
        const vertexNumbers = vertexString.match(/-?\d+(\.\d+)?([eE][+-]?\d+)?/g).map(Number);
        if (vertexNumbers.length % 3 !== 0) {
            console.error("Vertex data is not a multiple of 3.");
            process.exit(1);
        }
        let vertices = [];
        for (let i = 0; i < vertexNumbers.length; i += 3) {
            vertices.push([vertexNumbers[i], vertexNumbers[i + 1], vertexNumbers[i + 2]]);
        }

        // Parse indices
        const indexString = indexBlock[1];
        const indexNumbers = indexString.match(/-?\d+/g).map(Number);
        let indices = indexNumbers;

        // Parse colors
        let colors = [];
        if (colorBlock) {
            const colorString = colorBlock[1];
            const colorNumbers = colorString.match(/-?\d+(\.\d+)?([eE][+-]?\d+)?/g).map(Number);
            if (colorNumbers.length % 3 !== 0) {
                console.error("Color data is not a multiple of 3.");
                process.exit(1);
            }
            for (let i = 0; i < colorNumbers.length; i += 3) {
                colors.push([colorNumbers[i], colorNumbers[i + 1], colorNumbers[i + 2]]);
            }
        } else {
            // Assign default colors if none are found
            colors = Array(vertices.length).fill([1.0, 1.0, 1.0]);
        }

        // Parse normals
        let normals = [];
        if (normalBlock) {
            const normalString = normalBlock[1];
            const normalNumbers = normalString.match(/-?\d+(\.\d+)?([eE][+-]?\d+)?/g).map(Number);
            if (normalNumbers.length % 3 !== 0) {
                console.error("Normal data is not a multiple of 3.");
                process.exit(1);
            }
            for (let i = 0; i < normalNumbers.length; i += 3) {
                normals.push([normalNumbers[i], normalNumbers[i + 1], normalNumbers[i + 2]]);
            }
        }

        // console.log(vertices.length, indices.length, colors.length, normals.length);
        chunkDatas.push({ vertices, indices, colors, normals, shapeChunkContent });
    }

    return {chunkDatas, firstChunkContent};
}

// Function to replace the vertices, colors, normals, and indices in VRML file with merged ones
function replaceVerticesAndIndicesInVRML(
    fileContent,
    mergedVertices,
    mergedColors,
    mergedNormals,
    updatedIndices
) {
    const vertexString = mergedVertices.map(v => v.join(' ')).join(',\n');
    const indexString = updatedIndices.join(',\n');
    const colorString = mergedColors.map(c => c.join(' ')).join(',\n');
    const normalString = mergedNormals.length > 0 ? mergedNormals.map(n => n.join(' ')).join(',\n') : '';

    let updatedContent = fileContent.replace(/point \[([\s\S]*?)\]/, `point [\n${vertexString}\n]`);
    updatedContent = updatedContent.replace(/coordIndex \[([\s\S]*?)\]/, `coordIndex [\n${indexString}\n]`);

    if (fileContent.match(/color \[([\s\S]*?)\]/)) {
        updatedContent = updatedContent.replace(/color \[([\s\S]*?)\]/, `color [\n${colorString}\n]`);
    } else {
        // Insert color block after coordIndex if it doesn't exist
        updatedContent = updatedContent.replace(/(coordIndex \[[\s\S]*?\])/, `$1\ncolor [\n${colorString}\n]`);
    }

    if (fileContent.match(/vector \[([\s\S]*?)\]/)) {
        updatedContent = updatedContent.replace(/vector \[([\s\S]*?)\]/, `vector [\n${normalString}\n]`);
    }

    return updatedContent;
}

module.exports = {
    parseVRML,
    replaceVerticesAndIndicesInVRML
};
