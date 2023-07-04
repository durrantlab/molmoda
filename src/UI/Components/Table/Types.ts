export interface IHeader {
    text: string;
    note?: string;
    width?: number;
    sortable?: boolean;
    showColumnFunc?: (tableData: ITableData) => boolean;
}

export interface ICellValue {
    val: string | number;

    // In some cases, you might want to sort by a different value (e.g., string
    // dates, but sort by timestamp).
    sortVal?: string | number;

    iconClasses?: string;
    iconClickEmitName?: string;
    iconShowFilterFunc?: (row: { [key: string]: CellValue }) => boolean;

    metaData?: any;  // Can store anything here, including associated treeNodeId. {}.
}

Are string a number ever really uwsed here? There are a bunch of ts-ignore necessary because of this.
Would be better to use ICellValue only if you can. Maybe do conversion in table if needed?

Actually, use use ICellValue instead of CellValue at select locaitons, can likely get rid of ts-ignore that way.

export type CellValue = string | number | ICellValue;

export interface ITableData {
    headers: IHeader[];
    rows: { [key: string]: CellValue }[];
}
