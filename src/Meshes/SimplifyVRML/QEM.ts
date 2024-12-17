// qem.js
// Implementation of Quadric Error Metrics (QEM) mesh simplification algorithm

// Helper class to represent vertex quadrics (4x4 matrix)
class Quadric {
    matrix: number[];

    constructor() {
        // Initialize 4x4 matrix with zeros
        this.matrix = Array(16).fill(0);
    }

    // Add another quadric to this one
    add(other: Quadric) {
        for (let i = 0; i < 16; i++) {
            this.matrix[i] += other.matrix[i];
        }
        return this;
    }

    // Compute quadric from plane equation (a, b, c, d)
    static fromPlane(a: number, b: number, c: number, d: number) {
        const q = new Quadric();
        // Q = pp^T where p = [a b c d]
        q.matrix[0] = a * a;
        q.matrix[1] = a * b;
        q.matrix[2] = a * c;
        q.matrix[3] = a * d;
        q.matrix[4] = b * a;
        q.matrix[5] = b * b;
        q.matrix[6] = b * c;
        q.matrix[7] = b * d;
        q.matrix[8] = c * a;
        q.matrix[9] = c * b;
        q.matrix[10] = c * c;
        q.matrix[11] = c * d;
        q.matrix[12] = d * a;
        q.matrix[13] = d * b;
        q.matrix[14] = d * c;
        q.matrix[15] = d * d;
        return q;
    }

    // Evaluate quadric at a point
    evaluate(point: [number, number, number]) {
        const [x, y, z] = point;
        const m = this.matrix;
        return (
            x * (m[0] * x + m[1] * y + m[2] * z + m[3]) +
            y * (m[4] * x + m[5] * y + m[6] * z + m[7]) +
            z * (m[8] * x + m[9] * y + m[10] * z + m[11]) +
            (m[12] * x + m[13] * y + m[14] * z + m[15])
        );
    }

    // Find optimal point that minimizes this quadric
    findOptimalPoint(
        initialGuess: [number, number, number]
    ): [number, number, number] {
        const m = this.matrix;
        // Solve 3x3 linear system
        const a = [
            [m[0], m[1], m[2]],
            [m[4], m[5], m[6]],
            [m[8], m[9], m[10]],
        ];
        const b = [-m[3], -m[7], -m[11]];

        try {
            const result = solveLinearSystem(a, b);
            return result || initialGuess;
        } catch (e) {
            return initialGuess;
        }
    }
}

// Helper class for edge collapses
class Edge {
    v1: number;
    v2: number;
    error: number;

    constructor(v1: number, v2: number, error: number) {
        this.v1 = v1;
        this.v2 = v2;
        this.error = error;
    }
}

// Helper function to solve 3x3 linear system using Cramer's rule
function solveLinearSystem(
    A: number[][],
    b: number[]
): [number, number, number] | null {
    const det = determinant3x3(A);
    if (Math.abs(det) < 1e-10) return null;

    const x =
        determinant3x3([
            [b[0], A[0][1], A[0][2]],
            [b[1], A[1][1], A[1][2]],
            [b[2], A[2][1], A[2][2]],
        ]) / det;

    const y =
        determinant3x3([
            [A[0][0], b[0], A[0][2]],
            [A[1][0], b[1], A[1][2]],
            [A[2][0], b[2], A[2][2]],
        ]) / det;

    const z =
        determinant3x3([
            [A[0][0], A[0][1], b[0]],
            [A[1][0], A[1][1], b[1]],
            [A[2][0], A[2][1], b[2]],
        ]) / det;

    return [x, y, z];
}

function determinant3x3(matrix: number[][]) {
    return (
        matrix[0][0] *
            (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
        matrix[0][1] *
            (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
        matrix[0][2] *
            (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
    );
}

// Compute face normal and plane equation
function computePlaneEquation(
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number]
): [number, number, number, number] | null {
    // Calculate normal using cross product
    const ux = v2[0] - v1[0],
        uy = v2[1] - v1[1],
        uz = v2[2] - v1[2];
    const vx = v3[0] - v1[0],
        vy = v3[1] - v1[1],
        vz = v3[2] - v1[2];

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    // Normalize
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (length < 1e-10) return null;

    const a = nx / length;
    const b = ny / length;
    const c = nz / length;
    const d = -(a * v1[0] + b * v1[1] + c * v1[2]);

    return [a, b, c, d];
}

// Main simplification function
export function simplifyMesh(
    vertices: [number, number, number][],
    indices: number[],
    colors: [number, number, number][],
    targetVertexCount: number
) {
    console.log(
        `Starting QEM simplification. Target vertex count: ${targetVertexCount}`
    );

    // Initialize vertex quadrics
    const vertexQuadrics = vertices.map(() => new Quadric());

    // Compute initial quadrics from faces
    for (let i = 0; i < indices.length; i += 4) {
        if (indices[i] === -1) continue;

        const v1 = vertices[indices[i]];
        const v2 = vertices[indices[i + 1]];
        const v3 = vertices[indices[i + 2]];

        const plane = computePlaneEquation(v1, v2, v3);
        if (!plane) continue;

        const faceQuadric = Quadric.fromPlane(...plane);

        // Add face quadric to vertex quadrics
        vertexQuadrics[indices[i]].add(faceQuadric);
        vertexQuadrics[indices[i + 1]].add(faceQuadric);
        vertexQuadrics[indices[i + 2]].add(faceQuadric);
    }

    // Build list of all edges and their costs
    const edges = [];
    const seen = new Set();

    for (let i = 0; i < indices.length; i += 4) {
        if (indices[i] === -1) continue;

        for (let j = 0; j < 3; j++) {
            const v1 = indices[i + j];
            const v2 = indices[i + ((j + 1) % 3)];

            const edgeKey = `${Math.min(v1, v2)},${Math.max(v1, v2)}`;
            if (seen.has(edgeKey)) continue;
            seen.add(edgeKey);

            // Skip edges between vertices with different colors
            if (!colorsMatch(colors[v1], colors[v2])) continue;

            const combinedQuadric = new Quadric();
            combinedQuadric.add(vertexQuadrics[v1]);
            combinedQuadric.add(vertexQuadrics[v2]);

            // Find optimal position for edge collapse
            const optimalPos = combinedQuadric.findOptimalPoint([
                (vertices[v1][0] + vertices[v2][0]) / 2,
                (vertices[v1][1] + vertices[v2][1]) / 2,
                (vertices[v1][2] + vertices[v2][2]) / 2,
            ]);

            // const edgeLength = Math.sqrt(
            //     (vertices[v1][0] - vertices[v2][0]) ** 2 +
            //         (vertices[v1][1] - vertices[v2][1]) ** 2 +
            //         (vertices[v1][2] - vertices[v2][2]) ** 2
            // );

            // console.log(edgeLength);

            const error = combinedQuadric.evaluate(optimalPos);
            edges.push(new Edge(v1, v2, error));
        }
    }

    // Sort edges by error
    edges.sort((a, b) => a.error - b.error);

    // Initialize tracking arrays
    const alive = new Array(vertices.length).fill(true);
    const mapping = new Array(vertices.length).fill(-1);
    const newVertices = [];
    const newColors = [];
    let currentVertex = 0;

    // Process edges until target count reached
    for (const edge of edges) {
        if (newVertices.length >= targetVertexCount) break;
        if (!alive[edge.v1] || !alive[edge.v2]) continue;

        // Compute optimal position
        const combinedQuadric = new Quadric();
        combinedQuadric.add(vertexQuadrics[edge.v1]);
        combinedQuadric.add(vertexQuadrics[edge.v2]);

        const optimalPos = combinedQuadric.findOptimalPoint([
            (vertices[edge.v1][0] + vertices[edge.v2][0]) / 2,
            (vertices[edge.v1][1] + vertices[edge.v2][1]) / 2,
            (vertices[edge.v1][2] + vertices[edge.v2][2]) / 2,
        ]);

        // Add new vertex and update mappings
        newVertices.push(optimalPos);
        newColors.push(colors[edge.v1]); // Use color from first vertex
        mapping[edge.v1] = currentVertex;
        mapping[edge.v2] = currentVertex;
        alive[edge.v1] = false;
        alive[edge.v2] = false;
        currentVertex++;
    }

    // Add remaining vertices
    for (let i = 0; i < vertices.length; i++) {
        if (alive[i]) {
            newVertices.push(vertices[i]);
            newColors.push(colors[i]);
            mapping[i] = currentVertex++;
        }
    }

    // Update face indices
    const newIndices = [];
    const seenFaces = new Set();

    for (let i = 0; i < indices.length; i += 4) {
        if (indices[i] === -1) continue;

        const v1 = mapping[indices[i]];
        const v2 = mapping[indices[i + 1]];
        const v3 = mapping[indices[i + 2]];

        // Skip degenerate faces
        if (v1 === v2 || v2 === v3 || v3 === v1) continue;

        // Skip duplicate faces
        const faceKey = [v1, v2, v3].sort().join(",");
        if (seenFaces.has(faceKey)) continue;
        seenFaces.add(faceKey);

        newIndices.push(v1, v2, v3, -1);
    }

    console.log(
        `QEM simplification complete. New vertex count: ${newVertices.length}`
    );
    return { vertices: newVertices, indices: newIndices, colors: newColors };
}

// Helper function to check if colors match within a small epsilon
function colorsMatch(
    c1: [number, number, number],
    c2: [number, number, number],
    epsilon = 0.001
) {
    return (
        Math.abs(c1[0] - c2[0]) < epsilon &&
        Math.abs(c1[1] - c2[1]) < epsilon &&
        Math.abs(c1[2] - c2[2]) < epsilon
    );
}
