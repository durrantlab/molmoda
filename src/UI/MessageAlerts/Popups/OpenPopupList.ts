const openPopupIds = new Set<string>();

/**
 * Registers a popup as opened.
 * 
 * @param  {string} popupId  The id of the popup.
 */
export function popupOpened(popupId: string) {
    openPopupIds.add(popupId);
    // console.log(openPopupIds);
}

/**
 * Registers a popup as closed.
 * 
 * @param  {string} popupId  The id of the popup.
 */
export function popupClosed(popupId: string) {
    openPopupIds.delete(popupId);
    // console.log(openPopupIds);
}

/**
 * Returns true if any popup is open.
 * 
 * @returns {boolean}  True if any popup is open.
 */
export function isAnyPopupOpen() {
    return openPopupIds.size > 0;
    // console.log(openPopupIds);
}