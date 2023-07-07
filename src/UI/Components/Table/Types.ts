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

export type CellValue = string | number | ICellValue;

export interface ITableData {
    headers: IHeader[];
    rows: { [key: string]: CellValue }[];
}
