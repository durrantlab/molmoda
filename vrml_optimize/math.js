// math.js

// Existing functions
function distance(vertex1, vertex2) {
    return Math.sqrt(
        (vertex1[0] - vertex2[0]) ** 2 +
        (vertex1[1] - vertex2[1]) ** 2 +
        (vertex1[2] - vertex2[2]) ** 2
    );
}

function distanceWithinCutoffSquared(vertex1, vertex2, cutoffSquared) {
    const dxsqrd = (vertex1[0] - vertex2[0]) ** 2;
    if (dxsqrd > cutoffSquared) {
        return false;
    }
    const dysqrd = (vertex1[1] - vertex2[1]) ** 2;
    if (dysqrd > cutoffSquared) {
        return false;
    }
    const dzsqrd = (vertex1[2] - vertex2[2]) ** 2;
    if (dzsqrd > cutoffSquared) {
        return false;
    }

    return dxsqrd + dysqrd + dzsqrd <= cutoffSquared;
}

function sameColor(color1, color2, epsilon = 0.001) {
    return Math.abs(color1[0] - color2[0]) < epsilon &&
        Math.abs(color1[1] - color2[1]) < epsilon &&
        Math.abs(color1[2] - color2[2]) < epsilon;
}

function truncateValues(arr) {
    return arr.map(num => Number(num.toFixed(2)));
}

// Updated vector math functions with error checking
function subtractVectors(v1, v2) {
    if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== 3 || v2.length !== 3) {
        console.error('Invalid input to subtractVectors:', v1, v2);
        return [0, 0, 0];
    }
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function crossProduct(v1, v2) {
    if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== 3 || v2.length !== 3) {
        console.error('Invalid input to crossProduct:', v1, v2);
        return [0, 0, 0];
    }
    return [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
    ];
}

function vectorLength(v) {
    if (!Array.isArray(v) || v.length !== 3) {
        console.error('Invalid input to vectorLength:', v);
        return 0;
    }
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function scaleVector(v, scalar) {
    if (!Array.isArray(v) || v.length !== 3 || typeof scalar !== 'number') {
        console.error('Invalid input to scaleVector:', v, scalar);
        return [0, 0, 0];
    }
    return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function addVectors(v1, v2) {
    if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== 3 || v2.length !== 3) {
        console.error('Invalid input to addVectors:', v1, v2);
        return [0, 0, 0];
    }
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

module.exports = {
    distance,
    sameColor,
    truncateValues,
    subtractVectors,
    crossProduct,
    vectorLength,
    scaleVector,
    addVectors,
    distanceWithinCutoffSquared
};