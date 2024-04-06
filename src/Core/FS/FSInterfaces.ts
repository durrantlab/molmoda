export interface IData {
    headers: string[];
    rows: IDataRows
}

export type IDataRows = { [key: string]: any }[];

export enum DataFormat {
    JSON = "json",
    CSV = "csv",
    XLSX = "xlsx",
}