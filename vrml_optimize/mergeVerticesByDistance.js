const { distance, sameColor, truncateValues } = require('./math');

// Function to merge vertices and their colors within the given distance cutoff if colors match
function mergeVertices(vertices, colors, cutoff) {
    let mergedVertices = vertices.map(truncateValues);
    let mergedColors = colors.map(truncateValues);
    let mapping = new Map(vertices.map((_, i) => [i, i]));
    let mergeOccurred;

    do {
        mergeOccurred = false;
        let newMergedVertices = [];
        let newMergedColors = [];
        let newMapping = new Map();

        for (let i = 0; i < mergedVertices.length; i++) {
            let found = false;

            for (let j = 0; j < newMergedVertices.length; j++) {
                if (distance(mergedVertices[i], newMergedVertices[j]) < cutoff && 
                    sameColor(mergedColors[i], newMergedColors[j])) {
                    // Update mapping for all vertices that mapped to i
                    for (let [origIndex, mergedIndex] of mapping.entries()) {
                        if (mergedIndex === i) {
                            newMapping.set(origIndex, j);
                        }
                    }
                    found = true;
                    mergeOccurred = true;
                    break;
                }
            }

            if (!found) {
                for (let [origIndex, mergedIndex] of mapping.entries()) {
                    if (mergedIndex === i) {
                        newMapping.set(origIndex, newMergedVertices.length);
                    }
                }
                newMergedVertices.push(mergedVertices[i]);
                newMergedColors.push(mergedColors[i]);
            }
        }

        mergedVertices = newMergedVertices;
        mergedColors = newMergedColors;
        mapping = newMapping;

    } while (mergeOccurred);

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