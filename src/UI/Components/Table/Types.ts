export interface IHeader {
    text: string;
    note?: string;
    width?: number;
    showColumnFunc?: (tableData: ITableData) => boolean;
}

export interface ICellValue {
    val: string | number;
    iconClasses?: string;
    iconClickEmitName?: string;
    iconShowFilterFunc?: (row: { [key: string]: CellValue }) => boolean;
}

export type CellValue = string | number | ICellValue;

export interface ITableData {
    headers: IHeader[];
    rows: { [key: string]: CellValue }[];
}
