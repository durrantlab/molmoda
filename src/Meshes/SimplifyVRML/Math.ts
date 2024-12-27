// math.js

// Existing functions
/**
 * Calculate the distance between two vertices.
 * 
 * @param {number[]} vertex1  The first vertex.
 * @param {number[]} vertex2  The second vertex.
 * @returns {number}  The distance between the two vertices.
 */
export function distance(
    vertex1: [number, number, number],
    vertex2: [number, number, number]
): number {
    return Math.sqrt(
        (vertex1[0] - vertex2[0]) ** 2 +
            (vertex1[1] - vertex2[1]) ** 2 +
            (vertex1[2] - vertex2[2]) ** 2
    );
}

/**
 * Determine if the distance between two vertices is within a cutoff.
 *
 * @param {number[]} vertex1        The first vertex.
 * @param {number[]} vertex2        The second vertex.
 * @param {number}   cutoffSquared  The square of the cutoff distance.
 * @returns {boolean}  Whether the distance between the two vertices is within
 *     the cutoff.
 */
export function distanceWithinCutoffSquared(
    vertex1: [number, number, number],
    vertex2: [number, number, number],
    cutoffSquared: number
): boolean {
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

/**
 * Determine if two colors are the same.
 *
 * @param {number[]} color1   The first color.
 * @param {number[]} color2   The second color.
 * @param {number}   epsilon  The maximum difference between the colors.
 * @returns {boolean}  Whether the two colors are the same.
 */
export function sameColor(
    color1: [number, number, number],
    color2: [number, number, number],
    epsilon = 0.001
): boolean {
    return (
        Math.abs(color1[0] - color2[0]) < epsilon &&
        Math.abs(color1[1] - color2[1]) < epsilon &&
        Math.abs(color1[2] - color2[2]) < epsilon
    );
}

/**
 * Truncate the values in an array to two decimal places.
 *
 * @param {number[]} arr  The array of values.
 * @returns {number[]}  The array with the values truncated to two decimal
 *     places.
 */
export function truncateValues(arr: [number, number, number]): [number, number, number] {
    return arr.map((num) => Number(num.toFixed(2))) as [number, number, number]
}

// Updated vector math functions with error checking
/**
 * Subtract two vectors.
 *
 * @param {number[]} v1  The first vector.
 * @param {number[]} v2  The second vector.
 * @returns {number[]}  The result of subtracting the second vector from the
 *    first vector.
 */
export function subtractVectors(
    v1: [number, number, number],
    v2: [number, number, number]
): [number, number, number] {
    if (
        !Array.isArray(v1) ||
        !Array.isArray(v2) ||
        v1.length !== 3 ||
        v2.length !== 3
    ) {
        console.error("Invalid input to subtractVectors:", v1, v2);
        return [0, 0, 0];
    }
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

/**
 * Calculate the dot product of two vectors.
 *
 * @param {number[]} v1  The first vector.
 * @param {number[]} v2  The second vector.
 * @returns {number}  The dot product of the two vectors.
 */
export function crossProduct(
    v1: [number, number, number],
    v2: [number, number, number]
): [number, number, number] {
    if (
        !Array.isArray(v1) ||
        !Array.isArray(v2) ||
        v1.length !== 3 ||
        v2.length !== 3
    ) {
        console.error("Invalid input to crossProduct:", v1, v2);
        return [0, 0, 0];
    }
    return [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0],
    ];
}

/**
 * Calculate the length of a vector.
 * 
 * @param {number[]} v  The vector.
 * @returns {number}  The length of the vector.
 */
export function vectorLength(v: [number, number, number]): number {
    if (!Array.isArray(v) || v.length !== 3) {
        console.error("Invalid input to vectorLength:", v);
        return 0;
    }
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Scale a vector by a scalar.
 * 
 * @param {number[]} v       The vector.
 * @param {number}   scalar  The scalar.
 * @returns {number[]}  The vector scaled by the scalar.
 */
export function scaleVector(v: [number, number, number], scalar: number): [number, number, number] {
    if (!Array.isArray(v) || v.length !== 3 || typeof scalar !== "number") {
        console.error("Invalid input to scaleVector:", v, scalar);
        return [0, 0, 0];
    }
    return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

/**
 * Add two vectors.
 *
 * @param {number[]} v1  The first vector.
 * @param {number[]} v2  The second vector.
 * @returns {number[]}  The result of adding the two vectors.
 */
export function addVectors(
    v1: [number, number, number],
    v2: [number, number, number]
): [number, number, number] {
    if (
        !Array.isArray(v1) ||
        !Array.isArray(v2) ||
        v1.length !== 3 ||
        v2.length !== 3
    ) {
        console.error("Invalid input to addVectors:", v1, v2);
        return [0, 0, 0];
    }
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}