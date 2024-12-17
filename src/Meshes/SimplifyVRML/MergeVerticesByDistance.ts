import { distanceWithinCutoffSquared, sameColor, truncateValues } from "./Math";

export function mergeVertices(
    vertices: [number, number, number][],
    colors: [number, number, number][],
    cutoff: number
) {
    const mergedVertices = vertices.map(truncateValues);
    const mergedColors = colors.map(truncateValues);
    const mapping = new Map();
    const cutoffSquared = cutoff ** 2;

    // Create a spatial hash grid
    const gridSize = cutoff;
    const grid = new Map();

    function getGridKey(vertex: [number, number, number]) {
        const x = Math.floor(vertex[0] / gridSize);
        const y = Math.floor(vertex[1] / gridSize);
        const z = Math.floor(vertex[2] / gridSize);
        return `${x},${y},${z}`;
    }

    function addToGrid(index: number, vertex: [number, number, number]) {
        const key = getGridKey(vertex);
        if (!grid.has(key)) {
            grid.set(key, []);
        }
        grid.get(key).push(index);
    }

    // Process vertices
    for (let i = 0; i < mergedVertices.length; i++) {
        const vertex = mergedVertices[i];
        const color = mergedColors[i];
        const key = getGridKey(vertex);

        let merged = false;
        const neighborCells = [
            key,
            `${key.split(",")[0]},${key.split(",")[1]},${
                parseInt(key.split(",")[2]) + 1
            }`,
            `${key.split(",")[0]},${parseInt(key.split(",")[1]) + 1},${
                key.split(",")[2]
            }`,
            `${parseInt(key.split(",")[0]) + 1},${key.split(",")[1]},${
                key.split(",")[2]
            }`,
        ];

        for (const cellKey of neighborCells) {
            const cellVertices = grid.get(cellKey) || [];
            for (const j of cellVertices) {
                if (
                    distanceWithinCutoffSquared(
                        vertex,
                        mergedVertices[j],
                        cutoffSquared
                    ) &&
                    sameColor(color, mergedColors[j])
                ) {
                    mapping.set(i, j);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }

        if (!merged) {
            mapping.set(i, i);
            addToGrid(i, vertex);
        }
    }

    // Create final merged vertices and colors
    const uniqueIndices = new Set(mapping.values());
    const finalVertices = Array.from(uniqueIndices).map(
        (i) => mergedVertices[i]
    );
    const finalColors = Array.from(uniqueIndices).map((i) => mergedColors[i]);

    // Update mapping to use new indices
    const newIndexMap = new Map(
        Array.from(uniqueIndices).map((oldIndex, newIndex) => [
            oldIndex,
            newIndex,
        ])
    );
    for (const [key, value] of mapping) {
        mapping.set(key, newIndexMap.get(value));
    }

    return {
        mergedVertices: finalVertices,
        mergedColors: finalColors,
        mapping,
    };
}

export function updateIndices(
    indices: number[],
    mapping: Map<number, number>
): number[] {
    const updatedIdxs = indices.map((index) =>
        index === -1 ? -1 : mapping.get(index)
    );

    // Make sure all indices are valid
    for (const idx of updatedIdxs) {
        if (idx === undefined) {
            throw new Error("Invalid index mapping");
        }
    }

    return updatedIdxs as number[];
}
