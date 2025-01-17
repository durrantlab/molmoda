import { randomPastelColor } from './ColorConverter';

/**
 * Cache to store molecule colors to ensure consistency within a session
 */
const moleculeColors: { [key: string]: string } = {};

/**
 * Gets a consistent pastel color for a molecule ID.
 * The color will be the same each time for a given ID within a session.
 */
export function getMoleculeColor(moleculeId: string): string {
    if (!moleculeColors[moleculeId]) {
        moleculeColors[moleculeId] = randomPastelColor();
    }
    return moleculeColors[moleculeId];
}