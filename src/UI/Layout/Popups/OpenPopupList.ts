const openPopupIds = new Set<string>();

export function popupOpened(popupId: string) {
    openPopupIds.add(popupId);
    // console.log(openPopupIds);
}

export function popupClosed(popupId: string) {
    openPopupIds.delete(popupId);
    // console.log(openPopupIds);
}

export function isAnyPopupOpen() {
    return openPopupIds.size > 0;
    // console.log(openPopupIds);
}