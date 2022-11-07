export interface IFileInfo {
    name: string;
    // size: number;
    contents: any;  // string, or obj in some cases
    // type: string; // all caps, extension (e.g., "PDB")
}

export function getTypeFromFilename(filename: string): string {
    
}