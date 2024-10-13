// mergeVerticesByDistance.js
const { distance, sameColor, truncateValues } = require('./math');

// Function to merge vertices and their colors within the given distance cutoff if colors match
function mergeVertices(vertices, colors, cutoff) {
    let mergedVertices = [];
    let mergedColors = [];
    let mapping = new Map();

    for (let i = 0; i < vertices.length; i++) {
        let found = false;

        for (let j = 0; j < mergedVertices.length; j++) {
            // Only merge if the vertices are within the cutoff and have the same color
            if (distance(vertices[i], mergedVertices[j]) < cutoff && sameColor(colors[i], mergedColors[j])) {
                mapping.set(i, j); // Map the original index to the merged vertex index
                found = true;
                break;
            }
        }

        if (!found) {
            mapping.set(i, mergedVertices.length); // No merge, add as new vertex
            mergedVertices.push(truncateValues(vertices[i])); // Truncate to 3 decimal places
            mergedColors.push(truncateValues(colors[i])); // Truncate colors to 3 decimal places
        }
    }

    return { mergedVertices, mergedColors, mapping };
}

// Function to update the face indices based on the merged vertices
function updateIndices(indices, mapping) {
    return indices.map(index => (index === -1 ? -1 : mapping.get(index)));
}

module.exports = {
    mergeVertices,
    updateIndices
};
