// qem.js
// Revised Quadric Error Metric (QEM) mesh simplification with topology preservation

const { subtractVectors, crossProduct, vectorLength, scaleVector, addVectors } = require('./math');

function simplifyMesh(vertices, indices, targetVertexCount) {
    console.log(`Starting simplification. Target vertex count: ${targetVertexCount}`);
    let quadrics = initializeQuadrics(vertices, indices);
    let edges = buildEdgeList(vertices, indices);
    
    computeEdgeCosts(edges, quadrics, vertices);
    const edgeQueue = createPriorityQueue(edges);

    while (vertices.length > targetVertexCount && edgeQueue.size() > 0) {
        const edge = edgeQueue.pop();
        if (isEdgeValid(edge, vertices, indices) && !willCreateHole(edge, indices)) {
            const { newVertices, newIndices, newQuadrics } = collapseEdge(edge, vertices, indices, quadrics);
            vertices = newVertices;
            indices = newIndices;
            quadrics = newQuadrics;

            edges = buildEdgeList(vertices, indices);
            computeEdgeCosts(edges, quadrics, vertices);
            edgeQueue.update(edges);
        }
    }

    console.log(`Simplification complete. Final vertex count: ${vertices.length}`);
    return { vertices, indices };
}

function initializeQuadrics(vertices, indices) {
    const quadrics = vertices.map(() => createZeroQuadric());
    
    for (let i = 0; i < indices.length; i += 4) {
        if (indices[i] === -1) continue;
        const v1 = vertices[indices[i]];
        const v2 = vertices[indices[i+1]];
        const v3 = vertices[indices[i+2]];
        
        if (!v1 || !v2 || !v3) {
            console.error(`Invalid vertices at index ${i}: ${v1}, ${v2}, ${v3}`);
            continue;
        }

        const edge1 = subtractVectors(v2, v1);
        const edge2 = subtractVectors(v3, v1);
        let normal = crossProduct(edge1, edge2);
        const length = vectorLength(normal);
        
        if (length !== 0) {
            normal = scaleVector(normal, 1 / length);
            const planeConstant = -1 * (normal[0] * v1[0] + normal[1] * v1[1] + normal[2] * v1[2]);
            
            const q = computeQuadricFromPlane([...normal, planeConstant]);
            quadrics[indices[i]] = addQuadrics(quadrics[indices[i]], q);
            quadrics[indices[i+1]] = addQuadrics(quadrics[indices[i+1]], q);
            quadrics[indices[i+2]] = addQuadrics(quadrics[indices[i+2]], q);
        }
    }
    
    return quadrics;
}

function createZeroQuadric() {
    return {
        a2: 0, ab: 0, ac: 0, ad: 0,
        b2: 0, bc: 0, bd: 0,
        c2: 0, cd: 0,
        d2: 0,
    };
}

function computeQuadricFromPlane(plane) {
    const [a, b, c, d] = plane;
    return {
        a2: a * a, ab: a * b, ac: a * c, ad: a * d,
        b2: b * b, bc: b * c, bd: b * d,
        c2: c * c, cd: c * d,
        d2: d * d,
    };
}

function buildEdgeList(vertices, indices) {
    const edges = new Map();
    for (let i = 0; i < indices.length; i += 4) {
        if (indices[i] === -1) continue;
        const faceIndices = [indices[i], indices[i + 1], indices[i + 2]];
        for (let j = 0; j < 3; j++) {
            const v1 = faceIndices[j];
            const v2 = faceIndices[(j + 1) % 3];
            if (v1 === undefined || v2 === undefined) {
                console.error(`Invalid vertex indices at ${i}: ${v1}, ${v2}`);
                continue;
            }
            const edgeKey = `${Math.min(v1, v2)}_${Math.max(v1, v2)}`;
            if (!edges.has(edgeKey)) {
                edges.set(edgeKey, { v1: Math.min(v1, v2), v2: Math.max(v1, v2), faces: [] });
            }
            edges.get(edgeKey).faces.push(Math.floor(i / 4));
        }
    }
    return Array.from(edges.values());
}

function computeEdgeCosts(edges, quadrics, vertices) {
    for (let edge of edges) {
        if (!quadrics[edge.v1] || !quadrics[edge.v2]) {
            console.error(`Missing quadric for vertex ${edge.v1} or ${edge.v2}`);
            continue;
        }
        const q = addQuadrics(quadrics[edge.v1], quadrics[edge.v2]);
        const vOptimal = computeOptimalVertexPosition(q);
        edge.cost = computeError(q, vOptimal);
        edge.vOptimal = vOptimal;
    }
}

function computeOptimalVertexPosition(q) {
    const A = [
        [q.a2, q.ab, q.ac, q.ad],
        [q.ab, q.b2, q.bc, q.bd],
        [q.ac, q.bc, q.c2, q.cd],
        [0, 0, 0, 1]
    ];
    const b = [0, 0, 0, 1];
    
    // Solve Ax = b using Gaussian elimination with partial pivoting
    for (let i = 0; i < 4; i++) {
        let maxEl = Math.abs(A[i][i]);
        let maxRow = i;
        for (let k = i + 1; k < 4; k++) {
            if (Math.abs(A[k][i]) > maxEl) {
                maxEl = Math.abs(A[k][i]);
                maxRow = k;
            }
        }

        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [b[i], b[maxRow]] = [b[maxRow], b[i]];

        for (let k = i + 1; k < 4; k++) {
            const c = -A[k][i] / A[i][i];
            for (let j = i; j < 4; j++) {
                if (i === j) {
                    A[k][j] = 0;
                } else {
                    A[k][j] += c * A[i][j];
                }
            }
            b[k] += c * b[i];
        }
    }

    const x = new Array(4);
    for (let i = 3; i >= 0; i--) {
        x[i] = b[i] / A[i][i];
        for (let k = i - 1; k >= 0; k--) {
            b[k] -= A[k][i] * x[i];
        }
    }

    return x.slice(0, 3);
}

function computeError(q, v) {
    const [x, y, z] = v;
    return q.a2*x*x + 2*q.ab*x*y + 2*q.ac*x*z + 2*q.ad*x +
           q.b2*y*y + 2*q.bc*y*z + 2*q.bd*y +
           q.c2*z*z + 2*q.cd*z +
           q.d2;
}

function createPriorityQueue(edges) {
    return {
        edges: [...edges].sort((a, b) => a.cost - b.cost),
        pop: function() { return this.edges.shift(); },
        size: function() { return this.edges.length; },
        update: function(newEdges) {
            this.edges = newEdges.sort((a, b) => a.cost - b.cost);
        },
    };
}

function isEdgeValid(edge, vertices, indices) {
    return indices.some(idx => idx === edge.v1 || idx === edge.v2);
}

function willCreateHole(edge, indices) {
    const { v1, v2 } = edge;
    const sharedFaces = indices.reduce((acc, curr, idx) => {
        if (idx % 4 === 3) return acc; // Skip -1 indices
        if ((curr === v1 || curr === v2) && 
            (indices[idx + 1] === v1 || indices[idx + 1] === v2) && 
            (indices[idx + 2] === v1 || indices[idx + 2] === v2)) {
            acc.push(Math.floor(idx / 4));
        }
        return acc;
    }, []);

    if (sharedFaces.length <= 2) return false; // Edge collapse won't create a hole

    // Check if the shared faces form a loop
    const adjacencyList = {};
    for (let face of sharedFaces) {
        adjacencyList[face] = [];
    }

    for (let i = 0; i < indices.length; i += 4) {
        if (sharedFaces.includes(Math.floor(i / 4))) {
            const faceVertices = [indices[i], indices[i + 1], indices[i + 2]];
            for (let j = 0; j < 3; j++) {
                const v1 = faceVertices[j];
                const v2 = faceVertices[(j + 1) % 3];
                if (v1 !== edge.v1 && v1 !== edge.v2 && v2 !== edge.v1 && v2 !== edge.v2) {
                    const neighborFace = sharedFaces.find(f => 
                        f !== Math.floor(i / 4) && 
                        indices.slice(f * 4, f * 4 + 3).includes(v1) && 
                        indices.slice(f * 4, f * 4 + 3).includes(v2)
                    );
                    if (neighborFace !== undefined) {
                        adjacencyList[Math.floor(i / 4)].push(neighborFace);
                    }
                }
            }
        }
    }

    // Check if the adjacency list forms a single loop
    const visited = new Set();
    const stack = [sharedFaces[0]];
    while (stack.length > 0) {
        const face = stack.pop();
        if (!visited.has(face)) {
            visited.add(face);
            stack.push(...adjacencyList[face]);
        }
    }

    return visited.size !== sharedFaces.length;
}

function collapseEdge(edge, vertices, indices, quadrics) {
    const v1 = edge.v1;
    const v2 = edge.v2;

    vertices[v1] = edge.vOptimal;
    quadrics[v1] = addQuadrics(quadrics[v1], quadrics[v2]);

    vertices.splice(v2, 1);
    quadrics.splice(v2, 1);

    let newIndices = [];
    for (let i = 0; i < indices.length; i += 4) {
        let face = [indices[i], indices[i+1], indices[i+2]];
        face = face.map(idx => idx === v2 ? v1 : (idx > v2 ? idx - 1 : idx));
        if (new Set(face).size === 3) {
            newIndices.push(...face, -1);
        }
    }

    return { newVertices: vertices, newIndices, newQuadrics: quadrics };
}

function addQuadrics(q1, q2) {
    if (!q1 || !q2) {
        console.error('Undefined quadric in addQuadrics');
        return createZeroQuadric();
    }
    return {
        a2: q1.a2 + q2.a2, ab: q1.ab + q2.ab, ac: q1.ac + q2.ac, ad: q1.ad + q2.ad,
        b2: q1.b2 + q2.b2, bc: q1.bc + q2.bc, bd: q1.bd + q2.bd,
        c2: q1.c2 + q2.c2, cd: q1.cd + q2.cd,
        d2: q1.d2 + q2.d2,
    };
}

module.exports = {
    simplifyMesh,
};