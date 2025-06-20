const BASE_MODAL_Z_INDEX = 1055; // Default Bootstrap modal z-index.
const Z_INDEX_INCREMENT = 10; // Leave space for backdrops etc.

const openModalZIndices: number[] = [];

/**
 * Gets the next available z-index for a new modal.
 * 
 * @returns {number} The z-index to use for the new modal.
 */
export function getNextZIndex(): number {
    const highestZIndex = openModalZIndices.length > 0
            ? Math.max(...openModalZIndices)
            : BASE_MODAL_Z_INDEX - Z_INDEX_INCREMENT; // Start from base so first modal gets BASE_MODAL_Z_INDEX

    const newZIndex = highestZIndex + Z_INDEX_INCREMENT;
    openModalZIndices.push(newZIndex);
    return newZIndex;
}

/**
 * Releases a z-index when a modal is closed.
 * 
 * @param {number} zIndex The z-index that is no longer in use.
 */
export function releaseZIndex(zIndex: number): void {
    const index = openModalZIndices.indexOf(zIndex);
    if (index > -1) {
        openModalZIndices.splice(index, 1);
    }
}
