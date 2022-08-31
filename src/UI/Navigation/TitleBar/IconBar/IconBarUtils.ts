/**
 * Styles for flex fixed width.
 * 
 * @param  {number} width  The width to style.
 * @returns {string}  The style string.
 */
export function flexFixedWidthStyle(width: number): string {
    return `flex:0; max-width:${width}px; min-width:${width}px;`;
}